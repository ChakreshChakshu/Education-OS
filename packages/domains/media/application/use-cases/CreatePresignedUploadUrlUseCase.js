const { Result } = require('../../core');
const { MediaAsset } = require('../../domain/entities/MediaAsset');

class CreatePresignedUploadUrlUseCase {
  constructor({ mediaAssetRepository, storageProvider }) {
    this.mediaAssetRepository = mediaAssetRepository;
    this.storageProvider = storageProvider;
  }

  async execute(dto) {
    const { tenantId, uploaderUserId, filename, mimeType, sizeBytes } = dto;

    const assetRes = MediaAsset.create({
      tenantId,
      uploaderUserId,
      filename,
      mimeType,
      size: sizeBytes
    });

    if (assetRes.isFailure) {
      return Result.fail(assetRes.error);
    }

    const asset = assetRes.getValue();

    let uploadUrl = `/uploads/${asset.storageKey}`;
    if (this.storageProvider && this.storageProvider.getSignedUrl) {
      uploadUrl = await this.storageProvider.getSignedUrl(asset.storageKey, 3600);
    }

    if (this.mediaAssetRepository && this.mediaAssetRepository.save) {
      await this.mediaAssetRepository.save(asset);
    }

    return Result.ok({
      id: asset.id,
      tenantId: asset.tenantId,
      filename: asset.filename,
      storageKey: asset.storageKey,
      uploadUrl,
      status: asset.status
    });
  }
}

module.exports = { CreatePresignedUploadUrlUseCase };
