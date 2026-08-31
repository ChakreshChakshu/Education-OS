/**
 * @eos/domain-media
 * Media & Video Pipeline Bounded Context
 * Governs MediaAssets, Video Transcoding, HLS Streaming, and File Storage Assets.
 */

module.exports = {
  domain: require('./domain'),
  application: require('./application'),
  infrastructure: require('./infrastructure'),
  presentation: require('./presentation')
};
