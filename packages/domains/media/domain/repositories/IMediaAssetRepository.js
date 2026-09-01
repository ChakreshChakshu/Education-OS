class IMediaAssetRepository {
  async findById(id) {
    throw new Error('IMediaAssetRepository.findById() not implemented');
  }

  async findByStorageKey(key) {
    throw new Error('IMediaAssetRepository.findByStorageKey() not implemented');
  }

  async save(mediaAsset) {
    throw new Error('IMediaAssetRepository.save() not implemented');
  }
}

module.exports = { IMediaAssetRepository };
