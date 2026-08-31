const { QueueProvider } = require('./QueueProvider');

class PostgresQueueProvider extends QueueProvider {
  constructor(databaseClient) {
    super();
    this.db = databaseClient;
  }

  async enqueue(queueName, payload, options = {}) {
    console.log(`[PostgresQueueProvider] Mock enqueuing to ${queueName} with payload:`, payload);
    return { id: Math.random().toString(), status: 'queued' };
  }

  async process(queueName, processorCallback) {
    console.log(`[PostgresQueueProvider] Mock starting processor loop for queue ${queueName}`);
    // Loop placeholder
  }
}

module.exports = { PostgresQueueProvider };
