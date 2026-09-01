const academicsRoutes = require('./academics');
const learningRoutes = require('./learning');
const mediaRoutes = require('./media');

async function internalRoutes(fastify, options) {
  const container = options.container;

  // Register sub-routers
  await fastify.register(academicsRoutes, { prefix: '/academics', container });
  await fastify.register(learningRoutes, { prefix: '/learning', container });
  await fastify.register(mediaRoutes, { prefix: '/media', container });

  fastify.get('/health', async (request, reply) => {
    const healthService = container.resolve('HealthService');
    return healthService.getHealth();
  });

  fastify.get('/me', async (request, reply) => {
    return { user: request.user || { id: 'mock-admin', role: 'admin' } };
  });

  // Tenant Provisioning Route
  fastify.post(
    '/tenants',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'slug', 'ownerUserId'],
          properties: {
            name: { type: 'string', minLength: 1 },
            slug: { type: 'string', minLength: 3 },
            ownerUserId: { type: 'string', format: 'uuid' },
            orgName: { type: 'string' },
            orgCode: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreateTenantUseCase');
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
}

module.exports = internalRoutes;
