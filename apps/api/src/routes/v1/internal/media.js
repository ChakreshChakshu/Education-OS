const fs = require('fs');
const path = require('path');

const crypto = require('crypto');
const { authorize } = require('../../../middleware/authorize');
const { requireTenant, isUuid, getUserId, isDevAuthBypassEnabled } = require('../../../middleware/tenantScope');

async function mediaRoutes(fastify, options) {
  const container = options.container;

  fastify.post('/upload', { preHandler: authorize('media.upload') }, async (request, reply) => {
    if (!requireTenant(request, reply)) {
      return;
    }
    const { filename, fileData, mimeType } = request.body || {};

    if (!filename || !fileData) {
      return reply.status(400).send({ success: false, error: 'Missing filename or fileData payload' });
    }

    const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const base64Data = fileData.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const isVideo = (mimeType && mimeType.startsWith('video/')) || /\.(mp4|mov|avi|mkv|webm)$/i.test(filename);
    const mediaAssetId = crypto.randomUUID();
    const effectiveMimeType = mimeType || (isVideo ? 'video/mp4' : 'application/octet-stream');

    const storageProvider = container.resolve('StorageProvider');
    const uploadResult = await storageProvider.upload(safeFilename, buffer, effectiveMimeType);
    const fileUrl = uploadResult.url;
    request.log.info(`[MediaUpload] Uploaded directly to Cloudflare R2: ${fileUrl}`);

    let filePath = null;
    if (isVideo) {
      const os = require('os');
      const tempDir = path.join(os.tmpdir(), 'eos_uploads');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      filePath = path.join(tempDir, safeFilename);
      fs.writeFileSync(filePath, buffer);
    }

    const hlsUrl = isVideo ? `http://localhost:3001/uploads/hls/${mediaAssetId}/master.m3u8` : null;

    const tenantId = request.tenantId || crypto.randomUUID();

    try {
      const dbClient = container.resolve('DatabaseClient');
      await dbClient.query(`
        INSERT INTO media_assets (id, tenant_id, filename, mime_type, size_bytes, storage_key, storage_url, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, storage_url = EXCLUDED.storage_url, updated_at = NOW()
      `, [
        mediaAssetId,
        tenantId,
        safeFilename,
        effectiveMimeType,
        buffer.length,
        safeFilename,
        fileUrl,
        isVideo ? 'ENCODING' : 'READY'
      ]);

      if (isVideo) {
        const outboxRepo = container.resolve('OutboxRepository');
        await outboxRepo.create({
          eventName: 'MediaUploaded',
          aggregateType: 'MediaAsset',
          aggregateId: mediaAssetId,
          payload: {
            mediaAssetId,
            filename: safeFilename,
            filePath,
            storageKey: safeFilename,
            tenantId
          }
        });
        request.log.info(`[MediaUpload] Created mediaAsset ${mediaAssetId} and published MediaUploaded outbox event`);
      }
    } catch (err) {
      request.log.warn(`[MediaUpload] Outbox / DB creation warning: ${err.message}`);
    }

    return reply.status(201).send({
      success: true,
      data: {
        id: mediaAssetId,
        filename: safeFilename,
        path: filePath,
        url: fileUrl,
        hlsUrl: isVideo ? hlsUrl : null,
        status: isVideo ? 'ENCODING' : 'READY',
        mimeType: mimeType || 'application/octet-stream'
      }
    });
  });

  fastify.get('/status/:id', { preHandler: authorize('media.upload') }, async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) {
      return reply.status(400).send({ success: false, error: 'Invalid media asset ID' });
    }
    if (!requireTenant(request, reply)) {
      return;
    }
    try {
      const dbClient = container.resolve('DatabaseClient');
      const res = await dbClient.query(
        `SELECT id, status, filename, hls_manifest_url FROM media_assets
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, request.tenantId]
      );
      const row = res.rows[0];
      if (!row) {
        return reply.status(404).send({ success: false, error: 'Media asset not found' });
      }
      return reply.send({
        success: true,
        data: {
          id: row.id,
          status: row.status,
          filename: row.filename,
          hlsUrl: row.hls_manifest_url || `http://localhost:3001/uploads/hls/${id}/master.m3u8`
        }
      });
    } catch (err) {
      request.log.error({ err }, 'Failed to read media status');
      return reply.status(500).send({ success: false, error: 'Failed to read media status' });
    }
  });

  fastify.post(
    '/presign',
    {
      preHandler: authorize('media.upload'),
      schema: {
        body: {
          type: 'object',
          required: ['filename', 'mimeType', 'sizeBytes'],
          properties: {
            tenantId: { type: 'string' },
            filename: { type: 'string', minLength: 1 },
            mimeType: { type: 'string', minLength: 3 },
            sizeBytes: { type: 'number', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      if (!requireTenant(request, reply)) {
        return;
      }
      const useCase = container.resolve('CreatePresignedUploadUrlUseCase');
      const result = await useCase.execute({
        ...request.body,
        tenantId: request.tenantId,
        uploaderUserId: isDevAuthBypassEnabled() ? null : getUserId(request)
      });

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.getValue()
      });
    }
  );

  fastify.post('/confirm', { preHandler: authorize('media.upload') }, async (request, reply) => {
    if (!requireTenant(request, reply)) {
      return;
    }
    const { mediaAssetId, moduleId } = request.body || {};
    if (!isUuid(mediaAssetId) || (moduleId != null && !isUuid(moduleId))) {
      return reply.status(400).send({ success: false, error: 'Invalid media asset or module ID' });
    }
    const useCase = container.resolve('ConfirmMediaUploadUseCase');
    const result = await useCase.execute({ mediaAssetId, tenantId: request.tenantId });

    if (result.isFailure) {
      return reply.status(400).send({
        success: false,
        error: result.error
      });
    }

    const media = result.getValue();
    if (media.status === 'ENCODING') {
      const outboxRepo = container.resolve('OutboxRepository');
      await outboxRepo.create({
        eventName: 'MediaUploaded',
        aggregateType: 'MediaAsset',
        aggregateId: media.id,
        payload: {
          mediaAssetId: media.id,
          filename: media.filename,
          storageKey: media.storageKey,
          tenantId: media.tenantId,
          moduleId: moduleId || null
        }
      });
    }

    return reply.status(200).send({
      success: true,
      data: media
    });
  });
}

module.exports = mediaRoutes;
