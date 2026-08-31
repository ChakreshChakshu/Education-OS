class CacheProvider {
  async get(key) {
    throw new Error('Method not implemented.');
  }

  async set(key, value, ttlSeconds) {
    throw new Error('Method not implemented.');
  }

  async delete(key) {
    throw new Error('Method not implemented.');
  }
}

class InMemoryCacheProvider extends CacheProvider {
  constructor() {
    super();
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key, value, ttlSeconds = 0) {
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async delete(key) {
    this.store.delete(key);
  }
}

class RedisCacheProvider extends CacheProvider {
  async get(key) {
    console.log('[RedisCacheProvider] Get stub for key:', key);
    return null;
  }

  async set(key, value, ttlSeconds) {
    console.log('[RedisCacheProvider] Set stub for key:', key);
  }

  async delete(key) {
    console.log('[RedisCacheProvider] Delete stub for key:', key);
  }
}

module.exports = {
  CacheProvider,
  InMemoryCacheProvider,
  RedisCacheProvider
};
