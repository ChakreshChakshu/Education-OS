const { Entity, Result } = require('../../core');
const crypto = require('crypto');

class VideoTrack extends Entity {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      resolution: props.resolution || '720p',
      bitrateKbps: props.bitrateKbps || 2500,
      playlistUrl: props.playlistUrl
    };
  }

  get resolution() {
    return this.props.resolution;
  }

  get bitrateKbps() {
    return this.props.bitrateKbps;
  }

  get playlistUrl() {
    return this.props.playlistUrl;
  }

  static create(props, id) {
    if (!props.playlistUrl) {
      return Result.fail('Playlist URL is required for video track.');
    }
    return Result.ok(new VideoTrack(props, id));
  }
}

module.exports = { VideoTrack };
