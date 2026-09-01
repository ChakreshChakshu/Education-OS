const { BaseRepository } = require('./BaseRepository');
const { mediaAssetsTable } = require('../schema/media.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleMediaAssetRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = mediaAssetsTable;
    this._assetStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { MediaAsset } = require('../domain-media-bridge');

    const res = MediaAsset.create(
      {
        tenantId: row.tenantId || row.tenant_id,
        uploaderUserId: row.uploaderUserId || row.uploader_user_id,
        filename: row.filename,
        mimeType: row.mimeType || row.mime_type,
        size: row.sizeBytes || row.size_bytes,
        storageKey: row.storageKey || row.storage_key,
        status: row.status,
        hlsManifestUrl: row.hlsManifestUrl || row.hls_manifest_url,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at
      },
      row.id
    );

    return res.isSuccess ? res.getValue() : null;
  }

  static toPersistence(asset) {
    return {
      id: asset.id,
      tenantId: asset.tenantId,
      uploaderUserId: asset.uploaderUserId,
      filename: asset.filename,
      mimeType: asset.mimeType.value,
      sizeBytes: asset.size.bytes,
      storageKey: asset.storageKey,
      status: asset.status,
      hlsManifestUrl: asset.hlsManifestUrl,
      createdAt: asset.props.createdAt,
      updatedAt: asset.props.updatedAt
    };
  }

  async findById(id) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleMediaAssetRepository.toDomain(rows[0]) : null;
    }
    const raw = this._assetStore.get(id);
    return raw ? DrizzleMediaAssetRepository.toDomain(raw) : null;
  }

  async findByStorageKey(key) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.storageKey, key), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleMediaAssetRepository.toDomain(rows[0]) : null;
    }
    for (const raw of this._assetStore.values()) {
      if (raw.storageKey === key && !raw.deletedAt) {
        return DrizzleMediaAssetRepository.toDomain(raw);
      }
    }
    return null;
  }

  async save(mediaAsset) {
    const raw = DrizzleMediaAssetRepository.toPersistence(mediaAsset);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._assetStore.set(mediaAsset.id, raw);
    return mediaAsset;
  }
}

module.exports = { DrizzleMediaAssetRepository };
