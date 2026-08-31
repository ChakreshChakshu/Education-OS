const dotenv = require('dotenv');

function bootstrapWorker() {
  dotenv.config();
  console.log('[Worker Bootstrap] Background worker environment initialized');
}

module.exports = { bootstrapWorker };
