class QueueProvider {
  constructor() {
    if (this.constructor === QueueProvider) {
      throw new Error("Abstract class 'QueueProvider' cannot be instantiated directly.");
    }
  }

  async enqueue(queueName, payload, options = {}) {
    throw new Error("Method 'enqueue()' must be implemented.");
  }

  async process(queueName, processorCallback) {
    throw new Error("Method 'process()' must be implemented.");
  }
}

module.exports = { QueueProvider };
