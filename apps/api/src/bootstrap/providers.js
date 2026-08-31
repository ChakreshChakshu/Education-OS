const { LocalStorageProvider } = require('@eos/infra-storage');
const { PostgresQueueProvider } = require('@eos/infra-queue');
const { InMemoryCacheProvider } = require('@eos/infra-cache');
const { JwtAuthProvider } = require('@eos/infra-auth');

function registerProviders(container) {
  container.register('StorageProvider', () => new LocalStorageProvider());
  container.register('QueueProvider', () => new PostgresQueueProvider());
  container.register('CacheProvider', () => new InMemoryCacheProvider());
  container.register('AuthProvider', () => new JwtAuthProvider());
}

module.exports = { registerProviders };
