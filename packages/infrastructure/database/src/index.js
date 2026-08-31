const { DatabaseClient } = require('./client');
const { schema } = require('./schema');
const { runMigrations } = require('./migrations');
const { BaseRepository } = require('./repositories');
const { seedDatabase } = require('./seed');
const { executeTransaction } = require('./transactions');

class DatabaseProvider {
  constructor(config = {}) {
    this.client = new DatabaseClient(config);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.disconnect();
  }
}

module.exports = {
  DatabaseProvider,
  DatabaseClient,
  schema,
  runMigrations,
  BaseRepository,
  seedDatabase,
  executeTransaction
};
