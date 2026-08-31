const { StorageProvider } = require('./StorageProvider');

class LocalStorageProvider extends StorageProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async upload(key, fileBuffer, mimeType) {
    console.log(`[LocalStorageProvider] Mock saving ${key} to local disk folder ${this.config.uploadDir || './uploads'}`);
    return { key, url: `/uploads/${key}` };
  }

  async download(key) {
    console.log(`[LocalStorageProvider] Mock loading ${key}`);
    return Buffer.from('');
  }

  async delete(key) {
    console.log(`[LocalStorageProvider] Mock deleting ${key} from local disk`);
    return true;
  }

  async getSignedUrl(key, expiresInSeconds) {
    return `/uploads/${key}`;
  }
}

module.exports = { LocalStorageProvider };
