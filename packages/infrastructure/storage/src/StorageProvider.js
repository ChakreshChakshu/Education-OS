class StorageProvider {
  constructor() {
    if (this.constructor === StorageProvider) {
      throw new Error("Abstract class 'StorageProvider' cannot be instantiated directly.");
    }
  }

  async upload(key, fileBuffer, mimeType) {
    throw new Error("Method 'upload()' must be implemented.");
  }

  async download(key) {
    throw new Error("Method 'download()' must be implemented.");
  }

  async delete(key) {
    throw new Error("Method 'delete()' must be implemented.");
  }

  async getSignedUrl(key, expiresInSeconds) {
    throw new Error("Method 'getSignedUrl()' must be implemented.");
  }
}

module.exports = { StorageProvider };
