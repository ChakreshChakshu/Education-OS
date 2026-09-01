let LocalStorageProvider, PostgresQueueProvider, InMemoryCacheProvider, JwtAuthProvider;

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

try {
  JwtAuthProvider = require('@eos/infra-auth').JwtAuthProvider;
} catch (e) {
  JwtAuthProvider = require('../../../../packages/infrastructure/auth/src').JwtAuthProvider;
}

function registerProviders(container) {
  container.register('StorageProvider', () => new LocalStorageProvider());
  container.register('QueueProvider', () => new PostgresQueueProvider());
  container.register('CacheProvider', () => new InMemoryCacheProvider());
  container.register('AuthProvider', () => new JwtAuthProvider());
}

module.exports = { registerProviders };
