const fs = require('node:fs');
const path = require('node:path');

const contentTypes = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf'
};

async function uploadRoutes(fastify, { container, uploadsRoot = path.resolve('uploads') }) {
  fastify.get('/uploads/*', async (request, reply) => {
    const key = request.params['*'] || '';
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

    let asset;
    try {
      const realRoot = await fs.promises.realpath(uploadsRoot);
      const realFile = await fs.promises.realpath(filePath);
      if (!realFile.startsWith(realRoot + path.sep) || !(await fs.promises.stat(realFile)).isFile()) {
        return notFound();
      }
      asset = fs.createReadStream(realFile);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        return notFound();
      }
      try {
        const storage = container.resolve('StorageProvider');
        asset = await storage.download(key);
        if (!asset?.length) {
          return notFound();
        }
      } catch (err) {
        return notFound();
      }
    }

    const extension = path.extname(key).toLowerCase();
    reply.type(contentTypes[extension] || 'application/octet-stream');
    reply.header('Access-Control-Allow-Origin', '*');
    reply.removeHeader('Access-Control-Allow-Credentials');
    if (extension === '.m3u8') {
      reply.header('Cache-Control', 'no-cache');
    } else if (extension === '.ts') {
      reply.header('Cache-Control', 'public, max-age=86400');
    }
    return reply.send(asset);
  });
}

module.exports = uploadRoutes;
