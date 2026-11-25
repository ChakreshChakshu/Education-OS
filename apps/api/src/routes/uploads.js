const fs = require('node:fs');
const path = require('node:path');
const { canReadMedia, findMediaAsset } = require('./mediaAccess');

const contentTypes = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf'
};

async function uploadRoutes(fastify, { container, uploadsRoot = path.resolve('uploads') }) {
  fastify.get('/uploads/*', async (request, reply) => {
    const key = request.params['*'] || '';
    reply.header('Cache-Control', 'private, no-store');
    const notFound = () => reply.code(404).send({ error: 'File not found' });

    // Use the same relative key for disk and object storage.
    if (/[\\\u0000]/.test(key) || key.split('/').some(part => !part || part === '.' || part === '..')) {
      return notFound();
    }
    const filePath = path.resolve(uploadsRoot, key);
    const rootPrefix = path.resolve(uploadsRoot) + path.sep;
    if (!filePath.startsWith(rootPrefix)) {
      return notFound();
    }

    let record;
    try {
      record = await findMediaAsset(container.resolve('DatabaseClient'), key);
      if (!record || !(await canReadMedia(container, request, record, key))) return notFound();
    } catch (err) {
      request.log.error({ err }, 'Media authorization lookup failed');
      return reply.code(503).send({ error: 'Media temporarily unavailable' });
    }

    let asset;
    try {
      const realRoot = await fs.promises.realpath(uploadsRoot);
      const realFile = await fs.promises.realpath(filePath);
      if (realFile !== path.resolve(realRoot, key) || !(await fs.promises.stat(realFile)).isFile()) {
        return notFound();
      }
      asset = fs.createReadStream(realFile);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        return notFound();
      }
      try {
        const isPrivateObject = record.storage_key?.startsWith('private/');
        if (key.startsWith('hls/')) {
          asset = await container.resolve('PrivateStorageProvider').download(`private/${key}`);
          if (!asset?.length && !isPrivateObject) {
            asset = await container.resolve('StorageProvider').download(key);
          }
        } else {
          const storage = container.resolve(isPrivateObject ? 'PrivateStorageProvider' : 'StorageProvider');
          asset = await storage.download(key);
        }
        if (!asset?.length) {
          return notFound();
        }
      } catch (err) {
        return notFound();
      }
    }

    const extension = path.extname(key).toLowerCase();
    reply.type(contentTypes[extension] || 'application/octet-stream');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Content-Security-Policy', "default-src 'none'");
    return reply.send(asset);
  });
}

module.exports = uploadRoutes;
