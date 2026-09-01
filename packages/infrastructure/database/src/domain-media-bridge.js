let domainMedia;

try {
  domainMedia = require('@eos/domain-media');
} catch (e) {
  domainMedia = require('../../../domains/media');
}

module.exports = {
  MediaAsset: domainMedia.domain.MediaAsset,
  FileSize: domainMedia.domain.FileSize,
  MimeType: domainMedia.domain.MimeType
};
