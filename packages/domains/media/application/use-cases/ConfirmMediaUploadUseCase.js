const { Result } = require('../../core');

class ConfirmMediaUploadUseCase {
  constructor({ mediaAssetRepository }) {
    this.mediaAssetRepository = mediaAssetRepository;
  }

  async execute(dto) {
    const { mediaAssetId } = dto;

    const asset = await this.mediaAssetRepository.findById(mediaAssetId);
    if (!asset) {
      return Result.fail('Media asset not found.');
    }

    asset.markUploaded();
    await this.mediaAssetRepository.save(asset);

    return Result.ok({
      id: asset.id,
      filename: asset.filename,
      status: asset.status,
      storageKey: asset.storageKey
    });
  }
}

module.exports = { ConfirmMediaUploadUseCase };
