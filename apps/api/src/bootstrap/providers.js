let LocalStorageProvider, PostgresQueueProvider, InMemoryCacheProvider;

try {
  LocalStorageProvider = require('@eos/infra-storage').LocalStorageProvider;
} catch (e) {
  LocalStorageProvider = require('../../../../packages/infrastructure/storage/src').LocalStorageProvider;
}

try {
  PostgresQueueProvider = require('@eos/infra-queue').PostgresQueueProvider;
} catch (e) {
  PostgresQueueProvider = require('../../../../packages/infrastructure/queue/src').PostgresQueueProvider;
}

try {
  InMemoryCacheProvider = require('@eos/infra-cache').InMemoryCacheProvider;
} catch (e) {
  InMemoryCacheProvider = require('../../../../packages/infrastructure/cache/src').InMemoryCacheProvider;
}

function registerProviders(container) {
  container.register('StorageProvider', () => new LocalStorageProvider());
  container.register('QueueProvider', () => new PostgresQueueProvider());
  container.register('CacheProvider', () => new InMemoryCacheProvider());
}

module.exports = { registerProviders };
