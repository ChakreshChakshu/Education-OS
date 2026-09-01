const { AggregateRoot, Result } = require('../../core');
const { FileSize } = require('../value-objects/FileSize');
const { MimeType } = require('../value-objects/MimeType');
const crypto = require('crypto');

class MediaAsset extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      tenantId: props.tenantId,
      uploaderUserId: props.uploaderUserId,
      filename: props.filename,
      mimeType: props.mimeType,
      size: props.size,
      storageKey: props.storageKey,
      status: props.status || 'PENDING_UPLOAD',
      hlsManifestUrl: props.hlsManifestUrl || null,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get tenantId() {
    return this.props.tenantId;
  }

  get uploaderUserId() {
    return this.props.uploaderUserId;
  }

  get filename() {
    return this.props.filename;
  }

  get mimeType() {
    return this.props.mimeType;
  }

  get size() {
    return this.props.size;
  }

  get storageKey() {
    return this.props.storageKey;
  }

  get status() {
    return this.props.status;
  }

  get hlsManifestUrl() {
    return this.props.hlsManifestUrl;
  }

  markUploaded() {
    this.props.status = this.mimeType.isVideo ? 'ENCODING' : 'READY';
    this.props.updatedAt = new Date();
  }

  markReady(hlsUrl) {
    this.props.status = 'READY';
    if (hlsUrl) this.props.hlsManifestUrl = hlsUrl;
    this.props.updatedAt = new Date();
  }

  static create(props, id) {
    if (!props.tenantId) {
      return Result.fail('Tenant ID is required for media asset.');
    }
    if (!props.filename || props.filename.trim().length === 0) {
      return Result.fail('Filename is required.');
    }

    let mimeVo = props.mimeType;
    if (typeof props.mimeType === 'string') {
      const mimeRes = MimeType.create(props.mimeType);
      if (mimeRes.isFailure) return Result.fail(mimeRes.error);
      mimeVo = mimeRes.getValue();
    }

    let sizeVo = props.size;
    if (typeof props.size === 'number') {
      const sizeRes = FileSize.create(props.size);
      if (sizeRes.isFailure) return Result.fail(sizeRes.error);
      sizeVo = sizeRes.getValue();
    }

    const storageKey = props.storageKey || `${props.tenantId}/${crypto.randomUUID()}-${props.filename}`;

    const asset = new MediaAsset(
      {
        tenantId: props.tenantId,
        uploaderUserId: props.uploaderUserId || null,
        filename: props.filename.trim(),
        mimeType: mimeVo,
        size: sizeVo,
        storageKey,
        status: props.status || 'PENDING_UPLOAD',
        hlsManifestUrl: props.hlsManifestUrl || null,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(asset);
  }
}

module.exports = { MediaAsset };
