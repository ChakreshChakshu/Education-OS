const path = require('path');
const dotenv = require('dotenv');

let DatabaseClient, DrizzleOutboxRepository, PostgresQueueProvider;

try {
  DatabaseClient = require('@eos/infra-database').DatabaseClient;
  DrizzleOutboxRepository = require('@eos/infra-database').DrizzleOutboxRepository;
} catch (e) {
  DatabaseClient = require('../../../../packages/infrastructure/database/src').DatabaseClient;
  DrizzleOutboxRepository = require('../../../../packages/infrastructure/database/src').DrizzleOutboxRepository;
}

try {
  PostgresQueueProvider = require('@eos/infra-queue').PostgresQueueProvider;
} catch (e) {
  PostgresQueueProvider = require('../../../../packages/infrastructure/queue/src').PostgresQueueProvider;
}

async function bootstrapWorker() {
  dotenv.config();
  dotenv.config({ path: path.resolve(__dirname, '../../../../apps/api/.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

  console.log('[Worker Bootstrap] Background worker environment initialized');

  const dbClient = new DatabaseClient();
  await dbClient.connect();

  const outboxRepo = new DrizzleOutboxRepository(dbClient);
  const queueProvider = new PostgresQueueProvider(dbClient);

  return {
    dbClient,
    outboxRepo,
    queueProvider
  };
}

module.exports = { bootstrapWorker };
