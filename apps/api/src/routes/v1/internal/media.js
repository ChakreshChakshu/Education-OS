const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

async function mediaRoutes(fastify, options) {
  const container = options.container;

  // Direct File Upload Route (Saves to local ./uploads/)
  fastify.post('/upload', async (request, reply) => {
    const { filename, fileData, mimeType } = request.body || {};

    if (!filename || !fileData) {
      return reply.status(400).send({ success: false, error: 'Missing filename or fileData payload' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFilename);

    // Extract base64 buffer
    const base64Data = fileData.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `http://localhost:3001/uploads/${safeFilename}`;
    const isVideo = (mimeType && mimeType.startsWith('video/')) || /\.(mp4|mov|avi|mkv|webm)$/i.test(filename);
    const mediaAssetId = crypto.randomUUID();
    const hlsUrl = `http://localhost:3001/uploads/hls/${mediaAssetId}/master.m3u8`;

    let tenantId = request.headers['x-tenant-id'];
    if (!tenantId || tenantId === 'undefined') {
      try {
        const dbClient = container.resolve('DatabaseClient');
        const tRes = await dbClient.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || crypto.randomUUID();
      } catch (e) {
        tenantId = crypto.randomUUID();
      }
    }

    if (isVideo) {
      try {
        const dbClient = container.resolve('DatabaseClient');
        await dbClient.query(`
          INSERT INTO media_assets (id, tenant_id, filename, mime_type, size_bytes, storage_key, storage_url, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'ENCODING', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET status = 'ENCODING'
        `, [
          mediaAssetId,
          tenantId,
          safeFilename,
          mimeType || 'video/mp4',
          buffer.length,
          safeFilename,
          fileUrl
        ]);

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
      } catch (err) {
        request.log.warn(`[MediaUpload] Outbox / DB creation warning: ${err.message}`);
      }
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

  // Get Media Asset Transcode Status Route
  fastify.get('/status/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const dbClient = container.resolve('DatabaseClient');
      const res = await dbClient.query(
        'SELECT id, status, filename, hls_manifest_url, created_at, updated_at FROM media_assets WHERE id = $1',
        [id]
      );
      if (!res.rows || res.rows.length === 0) {
        // Check if HLS master manifest already exists on disk
        const manifestPath = path.join(process.cwd(), 'uploads', 'hls', id, 'master.m3u8');
        if (fs.existsSync(manifestPath)) {
          return reply.send({
            success: true,
            data: {
              id,
              status: 'READY',
              hlsUrl: `http://localhost:3001/uploads/hls/${id}/master.m3u8`
            }
          });
        }
        return reply.status(404).send({ success: false, error: 'Media asset not found' });
      }

      const row = res.rows[0];
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
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Create Presigned Upload URL Route
  fastify.post(
    '/presign',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'filename', 'mimeType', 'sizeBytes'],
          properties: {
            tenantId: { type: 'string' },
            uploaderUserId: { type: 'string' },
            filename: { type: 'string', minLength: 1 },
            mimeType: { type: 'string', minLength: 3 },
            sizeBytes: { type: 'number', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreatePresignedUploadUrlUseCase');
      const result = await useCase.execute(request.body);

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

  // Confirm File Upload Route
  fastify.post('/confirm', async (request, reply) => {
    const useCase = container.resolve('ConfirmMediaUploadUseCase');
    const result = await useCase.execute(request.body);

    if (result.isFailure) {
      return reply.status(400).send({
        success: false,
        error: result.error
      });
    }

    const media = result.getValue();
    try {
      const outboxRepo = container.resolve('OutboxRepository');
      await outboxRepo.create({
        eventName: 'MediaUploaded',
        aggregateType: 'MediaAsset',
        aggregateId: media.id,
        payload: {
          mediaAssetId: media.id,
          filename: media.filename,
          storageKey: media.storageKey,
          tenantId: media.tenantId
        }
      });
    } catch (e) {
      request.log.warn(`Failed to create MediaUploaded outbox event: ${e.message}`);
    }

    return reply.status(200).send({
      success: true,
      data: media
    });
  });
}

module.exports = mediaRoutes;
