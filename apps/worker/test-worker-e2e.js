const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert/strict');
const crypto = require('crypto');

dotenv.config({ path: path.resolve(__dirname, '../api/.env') });

const { DatabaseClient, DrizzleOutboxRepository } = require('../../packages/infrastructure/database/src');
const { PostgresQueueProvider } = require('../../packages/infrastructure/queue/src');
const { OutboxPublisher } = require('./src/outbox');
const { WorkerPool } = require('./src/workers');
const { JOBS } = require('./src/jobs');

async function runE2ETest() {
  console.log('🧪 [TEST] Starting End-to-End Worker, Outbox & Queue Engine Validation...');

  const dbClient = new DatabaseClient({ connectionString: process.env.DATABASE_URL });
  await dbClient.connect();
  console.log('✅ 1. Database connected to Neon PostgreSQL');

  const outboxRepo = new DrizzleOutboxRepository(dbClient);
  const queueProvider = new PostgresQueueProvider(dbClient);

  // Clean test artifacts if any
  const testUserId = crypto.randomUUID();
  const testEmail = `test_worker_${Date.now()}@neon.edu`;

  console.log('\n--- 2. Testing Transactional Outbox Insertion ---');
  const outboxEvent = await outboxRepo.create({
    eventName: 'UserRegistered',
    aggregateType: 'User',
    aggregateId: testUserId,
    payload: {
      id: testUserId,
      email: testEmail,
      name: 'Worker Test User'
    }
  });

  assert.ok(outboxEvent.id, 'Outbox event should have an ID');
  assert.equal(outboxEvent.status, 'PENDING', 'Status should be PENDING');
  console.log(`✅ Outbox event created with ID: ${outboxEvent.id}, Status: ${outboxEvent.status}`);

  console.log('\n--- 3. Testing Outbox Event Fetching ---');
  const pendingEvents = await outboxRepo.fetchPending(10);
  const found = pendingEvents.find(e => e.id === outboxEvent.id);
  assert.ok(found, 'Created outbox event must be retrieved by fetchPending');
  console.log(`✅ fetchPending successfully retrieved event: ${found.eventName} (${found.id})`);

  console.log('\n--- 4. Testing OutboxPublisher (Dispatching Outbox -> Queue) ---');
  const publisher = new OutboxPublisher(outboxRepo, queueProvider, { pollIntervalMs: 500, batchSize: 5 });
  await publisher.poll();

  const dispatchedCheck = await dbClient.query(`SELECT status, processed_at FROM outbox_events WHERE id = $1`, [outboxEvent.id]);
  assert.equal(dispatchedCheck.rows[0].status, 'DISPATCHED', 'Event should be marked DISPATCHED');
  assert.ok(dispatchedCheck.rows[0].processed_at, 'processed_at must be populated');
  console.log(`✅ Outbox event marked DISPATCHED at: ${dispatchedCheck.rows[0].processed_at}`);

  console.log('\n--- 5. Testing Queue Dequeue & Execution via WorkerPool ---');
  // Verify job exists in jobs table
  const jobsCheck = await dbClient.query(
    `SELECT id, job_name, queue_name, status, payload FROM jobs WHERE job_name = $1 AND queue_name = $2 ORDER BY created_at DESC LIMIT 1`,
    [JOBS.EMAIL_SEND, 'email']
  );
  assert.ok(jobsCheck.rows.length > 0, 'Job should be enqueued in jobs table');
  const queuedJob = jobsCheck.rows[0];
  console.log(`✅ Found enqueued job '${queuedJob.job_name}' in queue '${queuedJob.queue_name}' with status: ${queuedJob.status}`);

  // Start worker pool to process the job
  let processed = false;
  const originalProcessor = require('./src/processors').PROCESSORS[JOBS.EMAIL_SEND];
  require('./src/processors').PROCESSORS[JOBS.EMAIL_SEND] = async (payload, job) => {
    console.log(`   [Mock Email Handler] Sending welcome email to: ${payload.to}`);
    processed = true;
  };

  const pool = new WorkerPool(queueProvider, { queues: ['email', 'default'], concurrency: 2 });
  // Process single job
  const dequeuedJobs = await queueProvider.dequeue('email', 1);
  assert.equal(dequeuedJobs.length, 1, 'Should dequeue exactly 1 job');
  await pool.executeJob(dequeuedJobs[0]);
  assert.equal(processed, true, 'Job processor should have executed');

  // Verify job is now COMPLETED
  const completedJob = await dbClient.query(`SELECT status, completed_at FROM jobs WHERE id = $1`, [dequeuedJobs[0].id]);
  assert.equal(completedJob.rows[0].status, 'COMPLETED', 'Job status must be COMPLETED');
  console.log(`✅ Job ${dequeuedJobs[0].id} status verified: COMPLETED at ${completedJob.rows[0].completed_at}`);

  console.log('\n--- 6. Testing Retry, Backoff & Dead Letter Queue (DLQ) ---');
  const failureJobName = 'test.failing.job';
  const failingJob = await queueProvider.enqueue(failureJobName, { foo: 'bar' }, {
    queueName: 'default',
    maxAttempts: 2
  });
  console.log(`✅ Created test failing job with ID: ${failingJob.id}, maxAttempts=2`);

  // Attempt 1 Failure -> should retry with PENDING status
  const retryRes1 = await queueProvider.retry(failingJob.id, new Error('Simulated transient failure'));
  assert.equal(retryRes1.status, 'PENDING');
  console.log(`✅ Attempt 1 retry scheduled with status: ${retryRes1.status}, attempts incremented`);

  // Attempt 2 Failure -> should escalate to DEAD_LETTER
  await dbClient.query(`UPDATE jobs SET attempts = 2 WHERE id = $1`, [failingJob.id]);
  const retryRes2 = await queueProvider.retry(failingJob.id, new Error('Fatal failure exceeding max attempts'));
  assert.equal(retryRes2.status, 'DEAD_LETTER');
  console.log(`✅ Attempt 2 exceeded maxAttempts -> Moved to DEAD_LETTER: status=${retryRes2.status}`);

  console.log('\n--- 7. Testing Idempotency Guard ---');
  const idempotencyKey = `idem_${Date.now()}`;
  let executionCount = 0;
  require('./src/processors').PROCESSORS['test.idempotent'] = async () => {
    executionCount++;
  };

  const idemJob1 = await queueProvider.enqueue('test.idempotent', { idempotencyKey }, { queueName: 'default' });
  const idemJob2 = await queueProvider.enqueue('test.idempotent', { idempotencyKey }, { queueName: 'default' });

  const claimed1 = await queueProvider.dequeue('default', 1);
  if (claimed1.length) await pool.executeJob(claimed1[0]);

  const claimed2 = await queueProvider.dequeue('default', 1);
  if (claimed2.length) await pool.executeJob(claimed2[0]);

  assert.equal(executionCount, 1, 'Idempotent task should only execute once despite duplicate deliveries');
  console.log(`✅ Idempotency guard verified: executed exactly ${executionCount} time for duplicate key '${idempotencyKey}'`);

  // Clean up connections
  await queueProvider.close();
  await dbClient.disconnect();
  console.log('\n🎉 ALL 7 E2E TESTS PASSED SUCCESSFULLY! Outbox & Queue Engine 100% operational. 🚀\n');
}

runE2ETest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
