const { StorageProvider } = require('./StorageProvider');
const { R2StorageProvider } = require('./R2StorageProvider');
const { LocalStorageProvider } = require('./LocalStorageProvider');

module.exports = {
  StorageProvider,
  R2StorageProvider,
  LocalStorageProvider
};
