const { PROCESSORS } = require('../processors');

class WorkerPool {
  constructor() {
    this.active = false;
  }

  start() {
    this.active = true;
    console.log('[WorkerPool] Worker pool started, polling queue for jobs...');
    this.poll();
  }

  stop() {
    this.active = false;
    console.log('[WorkerPool] Worker pool stopped');
  }

  async poll() {
    while (this.active) {
      // Mock polling loop with a 5s delay
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log('[WorkerPool] Polled queue: No new jobs');
    }
  }
}

module.exports = { WorkerPool };
