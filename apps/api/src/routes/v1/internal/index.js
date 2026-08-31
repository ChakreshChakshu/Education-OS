async function internalRoutes(fastify, options) {
  const container = options.container;

  fastify.get('/health', async (request, reply) => {
    const healthService = container.resolve('HealthService');
    return healthService.getHealth();
  });

  fastify.get('/me', async (request, reply) => {
    return { user: request.user || { id: 'mock-admin', role: 'admin' } };
  });
}

module.exports = internalRoutes;
