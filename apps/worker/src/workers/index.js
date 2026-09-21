const { PROCESSORS } = require('../processors');

class WorkerPool {
  constructor(queueProvider, options = {}) {
    this.queue = queueProvider;
    this.queues = options.queues || ['default', 'video', 'email', 'billing'];
    this.concurrency = options.concurrency || 3;
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.active = false;
    this.inFlightJobs = new Set();
    this.processedIdempotencyKeys = new Set(); // In-memory LRU/dedup set for duplicate rejection
  }

  start() {
    this.active = true;
    console.log(`[WorkerPool] Worker pool started across queues [${this.queues.join(', ')}] with concurrency=${this.concurrency}`);
    this.poll();
  }

  async stop() {
    this.active = false;
    console.log('[WorkerPool] Stopping worker pool... waiting for in-flight jobs to complete');
    const start = Date.now();
    while (this.inFlightJobs.size > 0 && (Date.now() - start) < 5000) {
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('[WorkerPool] Worker pool cleanly stopped');
  }

  async poll() {
    while (this.active) {
      let foundJob = false;

      for (const queueName of this.queues) {
        if (!this.active) break;
        if (this.inFlightJobs.size >= this.concurrency) {
          await new Promise(r => setTimeout(r, 100));
          break;
        }

        try {
          const availableSlots = this.concurrency - this.inFlightJobs.size;
          if (availableSlots <= 0) break;

          const jobs = await this.queue.dequeue(queueName, availableSlots);
          if (jobs && jobs.length > 0) {
            foundJob = true;
            for (const job of jobs) {
              this.inFlightJobs.add(job.id);
              // Run job without blocking polling loop
              this.executeJob(job).finally(() => {
                this.inFlightJobs.delete(job.id);
              });
            }
          }
        } catch (err) {
          console.error(`[WorkerPool] Error polling queue ${queueName}:`, err.message);
        }
      }

      // If no jobs were found on any queue, back off slightly before polling again
      if (!foundJob) {
        await new Promise(r => setTimeout(r, this.pollIntervalMs));
      }
    }
  }

  async executeJob(job) {
    const { id, jobName, payload, attempts, maxAttempts } = job;
    console.log(`[WorkerPool] Executing job '${jobName}' (${id}) - Attempt ${attempts}/${maxAttempts}`);

    // Idempotency check: guard against duplicate task executions
    const idempotencyKey = payload && (payload.idempotencyKey || payload._idempotencyKey);
    if (idempotencyKey) {
      if (this.processedIdempotencyKeys.has(idempotencyKey)) {
        console.warn(`[WorkerPool] Idempotent skip: Key '${idempotencyKey}' already processed. Acknowledging duplicate job ${id}.`);
        await this.queue.ack(id);
        return;
      }
    }

    const processor = PROCESSORS[jobName];
    if (!processor) {
      const errMsg = `No processor registered for job '${jobName}'`;
      console.error(`[WorkerPool] ${errMsg}`);
      await this.queue.moveToDeadLetter(id, errMsg);
      return;
    }

    try {
      await processor(payload, job);
      await this.queue.ack(id);

      if (idempotencyKey) {
        this.processedIdempotencyKeys.add(idempotencyKey);
        // Keep set bounded
        if (this.processedIdempotencyKeys.size > 5000) {
          const first = this.processedIdempotencyKeys.values().next().value;
          this.processedIdempotencyKeys.delete(first);
        }
      }

      console.log(`[WorkerPool] Completed job '${jobName}' (${id}) successfully`);
    } catch (err) {
      console.error(`[WorkerPool] Failed job '${jobName}' (${id}):`, err.message);
      const retryResult = await this.queue.retry(id, err);
      if (retryResult && retryResult.status === 'DEAD_LETTER') {
        console.error(`[WorkerPool] 💀 Job '${jobName}' (${id}) EXHAUSTED max attempts (${maxAttempts}) -> Moved to DEAD_LETTER queue`);
      } else {
        console.warn(`[WorkerPool] Scheduled retry for job '${jobName}' (${id}) after backoff delay`);
      }
    }
  }
}

module.exports = { WorkerPool };
