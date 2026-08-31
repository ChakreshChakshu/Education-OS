const { bootstrapWorker } = require('./bootstrap');
const { startScheduler } = require('./scheduler');
const { WorkerPool } = require('./workers');

bootstrapWorker();
startScheduler();

const workerPool = new WorkerPool();
workerPool.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, shutting down...');
  workerPool.stop();
  process.exit(0);
});
