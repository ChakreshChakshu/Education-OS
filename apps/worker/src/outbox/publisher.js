const { JOBS } = require('../jobs');

class OutboxPublisher {
  constructor(outboxRepository, queueProvider, options = {}) {
    this.outboxRepo = outboxRepository;
    this.queue = queueProvider;
    this.pollIntervalMs = options.pollIntervalMs || 2000;
    this.batchSize = options.batchSize || 10;
    this.timer = null;
    this.isPolling = false;
  }

  start() {
    console.log(`[OutboxPublisher] Started polling outbox_events every ${this.pollIntervalMs}ms`);
    this.timer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[OutboxPublisher] Stopped outbox publisher');
  }

  /**
   * Translates domain events to queue jobs
   */
  translateEventToJob(event) {
    const { eventName, payload } = event;

    switch (eventName) {
      case 'UserRegistered':
        return {
          jobName: JOBS.EMAIL_SEND,
          queueName: 'email',
          payload: {
            to: payload.email,
            subject: 'Welcome to Education Operating System',
            template: 'welcome',
            userId: payload.id,
            name: payload.name
          }
        };

      case 'MediaUploaded':
        return {
          jobName: JOBS.VIDEO_TRANSCODE,
          queueName: 'video',
          payload: {
            mediaAssetId: payload.mediaAssetId || payload.id,
            filename: payload.filename,
            storageKey: payload.storageKey
          }
        };

      case 'TenantCreated':
        return {
          jobName: JOBS.BILLING_RECURRING,
          queueName: 'billing',
          payload: {
            tenantId: payload.id || payload.tenantId,
            action: 'INITIALIZE_TENANT_BILLING'
          }
        };

      default:
        // Generic job naming for unmapped domain events
        return {
          jobName: `event.${eventName.toLowerCase()}`,
          queueName: 'default',
          payload: payload
        };
    }
  }

  async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const pendingEvents = await this.outboxRepo.fetchPending(this.batchSize);

      for (const event of pendingEvents) {
        try {
          const jobSpec = this.translateEventToJob(event);
          await this.queue.enqueue(jobSpec.jobName, jobSpec.payload, {
            queueName: jobSpec.queueName,
            priority: 0
          });

          await this.outboxRepo.markDispatched(event.id);
          console.log(`[OutboxPublisher] Dispatched outbox event '${event.eventName}' (${event.id}) -> Job '${jobSpec.jobName}'`);
        } catch (dispatchErr) {
          console.error(`[OutboxPublisher] Error dispatching event ${event.id}:`, dispatchErr.message);
          await this.outboxRepo.markFailed(event.id, dispatchErr.message);
        }
      }
    } catch (err) {
      console.error('[OutboxPublisher] Polling error:', err.message);
    } finally {
      this.isPolling = false;
    }
  }
}

module.exports = { OutboxPublisher };
