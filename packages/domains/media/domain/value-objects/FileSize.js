const { ValueObject, Result } = require('../../core');

class FileSize extends ValueObject {
  get bytes() {
    return this.props.bytes;
  }

  get megaBytes() {
    return Math.round((this.props.bytes / (1024 * 1024)) * 100) / 100;
  }

  static isValid(bytes) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return false;
    const MAX_BYTES = 500 * 1024 * 1024; // 500 MB max limit
    return bytes <= MAX_BYTES;
  }

  static create(bytes) {
    if (!FileSize.isValid(bytes)) {
      return Result.fail('File size must be a positive number less than 500 MB.');
    }
    return Result.ok(new FileSize({ bytes: Math.floor(bytes) }));
  }
}

module.exports = { FileSize };
