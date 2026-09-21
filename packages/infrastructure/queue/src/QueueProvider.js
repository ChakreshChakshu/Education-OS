class QueueProvider {
  constructor() {
    if (this.constructor === QueueProvider) {
      throw new Error("Abstract class 'QueueProvider' cannot be instantiated directly.");
    }
  }

  /**
   * Enqueue a job
   * @param {string} jobName e.g. 'video.transcode', 'email.send'
   * @param {object} payload job arguments/data
   * @param {object} options { queueName, priority, delaySeconds, maxAttempts }
   */
  async enqueue(jobName, payload, options = {}) {
    throw new Error("Method 'enqueue()' must be implemented.");
  }

  /**
   * Dequeue pending jobs safely using FOR UPDATE SKIP LOCKED
   * @param {string} queueName
   * @param {number} limit
   */
  async dequeue(queueName = 'default', limit = 1) {
    throw new Error("Method 'dequeue()' must be implemented.");
  }

  /**
   * Acknowledge successful job completion
   * @param {string} jobId
   */
  async ack(jobId) {
    throw new Error("Method 'ack()' must be implemented.");
  }

  /**
   * Requeue job with exponential backoff or custom delay
   * @param {string} jobId
   * @param {string|Error} error
   * @param {number} [delaySeconds]
   */
  async retry(jobId, error, delaySeconds) {
    throw new Error("Method 'retry()' must be implemented.");
  }

  /**
   * Move failed job directly to Dead Letter Queue (DLQ)
   * @param {string} jobId
   * @param {string|Error} error
   */
  async moveToDeadLetter(jobId, error) {
    throw new Error("Method 'moveToDeadLetter()' must be implemented.");
  }

  /**
   * Cancel an enqueued job
   * @param {string} jobId
   */
  async cancel(jobId) {
    throw new Error("Method 'cancel()' must be implemented.");
  }

  /**
   * Continuous processing loop helper
   */
  async process(queueName, processorCallback) {
    throw new Error("Method 'process()' must be implemented.");
  }
}

module.exports = { QueueProvider };
