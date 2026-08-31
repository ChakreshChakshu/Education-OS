async function publicRoutes(fastify, options) {
  fastify.get('/ping', async (request, reply) => {
    return { status: 'pong' };
  });

  fastify.post('/auth/login', async (request, reply) => {
    return { token: 'mock-jwt-token-from-fastify' };
  });
}

module.exports = publicRoutes;
