const Fastify = require('fastify');
const cors = require('@fastify/cors');
const dotenv = require('dotenv');
const { container } = require('./bootstrap/container');
const { registerProviders } = require('./bootstrap/providers');
const { registerServices } = require('./bootstrap/services');
const internalV1Routes = require('./routes/v1/internal');
const publicV1Routes = require('./routes/v1/public');

dotenv.config();

// Composition Root Registration
registerProviders(container);
registerServices(container);

const fastify = Fastify({ logger: true });

async function start() {
  await fastify.register(cors);

  // Register versioned route handlers
  await fastify.register(internalV1Routes, { prefix: '/api/v1/internal', container });
  await fastify.register(publicV1Routes, { prefix: '/api/v1/public', container });

  const PORT = process.env.PORT || 4000;
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Fastify API] Server running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
