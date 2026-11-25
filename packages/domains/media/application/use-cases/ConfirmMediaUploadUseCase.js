const { Result } = require('../../core');

class ConfirmMediaUploadUseCase {
  constructor({ mediaAssetRepository }) {
    this.mediaAssetRepository = mediaAssetRepository;
  }

  async execute(dto) {
    const { mediaAssetId, tenantId } = dto;

    const asset = await this.mediaAssetRepository.findById(mediaAssetId);
    if (!tenantId || asset?.tenantId !== tenantId) {
      return Result.fail('Media asset not found.');
    }

    if (asset.status === 'PENDING_UPLOAD') {
      asset.markUploaded();
      await this.mediaAssetRepository.save(asset);
    }

    return Result.ok({
      id: asset.id,
      tenantId: asset.tenantId,
      filename: asset.filename,
      status: asset.status,
      storageKey: asset.storageKey
    });
  }
}

module.exports = { ConfirmMediaUploadUseCase };
