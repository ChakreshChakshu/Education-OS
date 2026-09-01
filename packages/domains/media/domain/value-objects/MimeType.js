const { ValueObject, Result } = require('../../core');

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

class MimeType extends ValueObject {
  get value() {
    return this.props.value;
  }

  get isVideo() {
    return this.props.value.startsWith('video/');
  }

  get isImage() {
    return this.props.value.startsWith('image/');
  }

  get isDocument() {
    return this.props.value === 'application/pdf';
  }

  static isValid(type) {
    if (!type || typeof type !== 'string') return false;
    return ALLOWED_MIME_TYPES.includes(type.trim().toLowerCase());
  }

  static create(type) {
    if (!MimeType.isValid(type)) {
      return Result.fail(
        `Unsupported MIME type '${type}'. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }
    return Result.ok(new MimeType({ value: type.trim().toLowerCase() }));
  }
}

module.exports = { MimeType, ALLOWED_MIME_TYPES };
