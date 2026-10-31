const { StorageProvider } = require('./StorageProvider');

class LocalStorageProvider extends StorageProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async upload(key, fileBuffer, mimeType) {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.resolve(this.config.uploadDir || './uploads');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, key);
    fs.writeFileSync(targetPath, fileBuffer);
    console.log(`[LocalStorageProvider] Saved ${key} to disk at ${targetPath}`);
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
