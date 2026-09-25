let LocalStorageProvider, R2StorageProvider, PostgresQueueProvider, InMemoryCacheProvider;

try {
  const storage = require('@eos/infra-storage');
  LocalStorageProvider = storage.LocalStorageProvider;
  R2StorageProvider = storage.R2StorageProvider;
} catch (e) {
  const storage = require('../../../../packages/infrastructure/storage/src');
  LocalStorageProvider = storage.LocalStorageProvider;
  R2StorageProvider = storage.R2StorageProvider;
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
  const hasR2 = Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

  if (hasR2 && R2StorageProvider) {
    container.register('StorageProvider', () => new R2StorageProvider());
    console.log('[StorageProvider] Initialized Cloudflare R2StorageProvider');
  } else {
    container.register('StorageProvider', () => new LocalStorageProvider());
  }

  container.register('QueueProvider', () => new PostgresQueueProvider());
  container.register('CacheProvider', () => new InMemoryCacheProvider());
}

module.exports = { registerProviders };
