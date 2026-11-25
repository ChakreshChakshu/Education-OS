const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { FileSize, MimeType, MediaAsset } = require('../domain');
const { CreatePresignedUploadUrlUseCase, ConfirmMediaUploadUseCase } = require('../application');

class MockMediaAssetRepository {
  constructor() {
    this.assets = new Map();
  }

  async findById(id) {
    return this.assets.get(id) || null;
  }

  async findByStorageKey(key) {
    for (const a of this.assets.values()) {
      if (a.storageKey === key) return a;
    }
    return null;
  }

  async save(asset) {
    this.assets.set(asset.id, asset);
    return asset;
  }
}

class MockStorageProvider {
  async getSignedUrl(key, expires) {
    return `https://r2.skillyards.com/upload/${key}?expires=${expires}`;
  }
}

test('FileSize ValueObject validates file size limits', () => {
  const valid = FileSize.create(1024 * 1024 * 50); // 50MB
  assert.equal(valid.isSuccess, true);
  assert.equal(valid.getValue().megaBytes, 50);

  const invalid = FileSize.create(1024 * 1024 * 600); // 600MB
  assert.equal(invalid.isFailure, true);
});

test('MimeType ValueObject validates supported video and image formats', () => {
  const video = MimeType.create('video/mp4');
  assert.equal(video.isSuccess, true);
  assert.equal(video.getValue().isVideo, true);

  const invalid = MimeType.create('application/exe');
  assert.equal(invalid.isFailure, true);
});

test('CreatePresignedUploadUrlUseCase creates pending asset and returns upload URL', async () => {
  const mediaAssetRepository = new MockMediaAssetRepository();
  const storageProvider = new MockStorageProvider();
  const tenantId = crypto.randomUUID();

  const useCase = new CreatePresignedUploadUrlUseCase({
    mediaAssetRepository,
    storageProvider
  });

  const result = await useCase.execute({
    tenantId,
    filename: 'lecture-1.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 1024 * 1024 * 120
  });

  assert.equal(result.isSuccess, true);
  const data = result.getValue();
  assert.equal(data.filename, 'lecture-1.mp4');
  assert.equal(data.status, 'PENDING_UPLOAD');
  assert.equal(data.uploadUrl.startsWith('https://r2.skillyards.com/upload/'), true);
});

test('ConfirmMediaUploadUseCase transition status to ENCODING for video files', async () => {
  const mediaAssetRepository = new MockMediaAssetRepository();
  const tenantId = crypto.randomUUID();

  const asset = MediaAsset.create({
    tenantId,
    filename: 'demo.mp4',
    mimeType: 'video/mp4',
    size: 1024 * 1024 * 10
  }).getValue();
  await mediaAssetRepository.save(asset);

  const useCase = new ConfirmMediaUploadUseCase({ mediaAssetRepository });

  const result = await useCase.execute({ mediaAssetId: asset.id, tenantId });

  assert.equal(result.isSuccess, true);
  assert.equal(result.getValue().status, 'ENCODING');
  assert.equal(result.getValue().tenantId, tenantId);
});

test('ConfirmMediaUploadUseCase leaves an asset untouched without a matching tenant', async () => {
  const mediaAssetRepository = new MockMediaAssetRepository();
  const asset = MediaAsset.create({
    tenantId: crypto.randomUUID(),
    filename: 'demo.mp4',
    mimeType: 'video/mp4',
    size: 1024
  }).getValue();
  await mediaAssetRepository.save(asset);
  const useCase = new ConfirmMediaUploadUseCase({ mediaAssetRepository });

  for (const tenantId of [undefined, crypto.randomUUID()]) {
    const result = await useCase.execute({ mediaAssetId: asset.id, tenantId });
    assert.equal(result.isFailure, true);
    assert.equal(asset.status, 'PENDING_UPLOAD');
    assert.equal((await mediaAssetRepository.findById(asset.id)).status, 'PENDING_UPLOAD');
  }
});
