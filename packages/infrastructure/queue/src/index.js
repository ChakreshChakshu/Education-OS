const { QueueProvider } = require('./QueueProvider');
const { PostgresQueueProvider } = require('./PostgresQueueProvider');

module.exports = {
  QueueProvider,
  PostgresQueueProvider
};
