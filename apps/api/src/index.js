const Fastify = require('fastify');
const cors = require('@fastify/cors');
const cookie = require('@fastify/cookie');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { container } = require('./bootstrap/container');
const { registerProviders } = require('./bootstrap/providers');
const { registerServices } = require('./bootstrap/services');
const internalV1Routes = require('./routes/v1/internal');
const publicV1Routes = require('./routes/v1/public');
const { verifyCsrf } = require('./middleware/csrf');

dotenv.config();

// Composition Root Registration
registerProviders(container);
registerServices(container);

const fastify = Fastify({ 
  logger: true,
  bodyLimit: 104857600 // 100 MB body limit for media uploads
});

async function start() {
  // credentials:true + an explicit origin (never '*') are both required for the
  // browser to accept and send httpOnly auth cookies cross-port (web:3000 -> api:3001).
  await fastify.register(cors, {
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true
  });

  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET // only needed for signed cookies; unused here
  });

  // Double-submit CSRF check for any cookie-authenticated, state-changing request.
  // Bearer-header clients (mobile/API) never carry our cookies, so they're unaffected.
  fastify.addHook('onRequest', verifyCsrf);

  // Serve uploads directory (including HLS multi-bitrate streams & segments)
  fastify.get('/uploads/*', async (request, reply) => {
    const subpath = request.params['*'] || '';
    const filePath = path.join(process.cwd(), 'uploads', subpath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return reply.status(404).send({ error: 'File not found' });
    }

    if (filePath.endsWith('.m3u8')) {
      reply.header('Content-Type', 'application/vnd.apple.mpegurl');
      reply.header('Cache-Control', 'no-cache');
    } else if (filePath.endsWith('.ts')) {
      reply.header('Content-Type', 'video/mp2t');
      reply.header('Cache-Control', 'public, max-age=86400');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      reply.header('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      reply.header('Content-Type', 'image/png');
    } else if (filePath.endsWith('.mp4')) {
      reply.header('Content-Type', 'video/mp4');
    }

    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  });

  // Register versioned route handlers
  await fastify.register(internalV1Routes, { prefix: '/api/v1/internal', container });
  await fastify.register(publicV1Routes, { prefix: '/api/v1/public', container });

  const PORT = process.env.PORT || 3001;
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Fastify API] Server running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
