const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../api/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { bootstrapWorker } = require('./bootstrap');
const { startScheduler } = require('./scheduler');
const { WorkerPool } = require('./workers');
const { OutboxPublisher } = require('./outbox');

async function main() {
  const { dbClient, outboxRepo, queueProvider } = await bootstrapWorker();

  startScheduler();

  const outboxPublisher = new OutboxPublisher(outboxRepo, queueProvider, {
    pollIntervalMs: 2000,
    batchSize: 10
  });
  outboxPublisher.start();

  const workerPool = new WorkerPool(queueProvider, {
    queues: ['default', 'video', 'email', 'billing'],
    concurrency: 4,
    pollIntervalMs: 1000
  });
  workerPool.start();

  const shutdown = async (signal) => {
    console.log(`\n[Worker] ${signal} received, shutting down gracefully...`);
    outboxPublisher.stop();
    await workerPool.stop();
    await queueProvider.close();
    await dbClient.disconnect();
    console.log('[Worker] Graceful shutdown complete. Exiting.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Worker Fatal Error]:', err);
  process.exit(1);
});
