const academicsRoutes = require('./academics');
const learningRoutes = require('./learning');
const mediaRoutes = require('./media');
const { authenticateJWT } = require('../../../middleware/auth');

async function internalRoutes(fastify, options) {
  const container = options.container;

  // Attach container to request context
  fastify.addHook('onRequest', async (request, reply) => {
    request.container = container;
  });

  // Enforce JWT Authentication on all internal endpoints
  fastify.addHook('onRequest', authenticateJWT);

  // Register sub-routers
  await fastify.register(academicsRoutes, { prefix: '/academics', container });
  await fastify.register(learningRoutes, { prefix: '/learning', container });
  await fastify.register(mediaRoutes, { prefix: '/media', container });

  fastify.get('/health', async (request, reply) => {
    const healthService = container.resolve('HealthService');
    return healthService.getHealth();
  });

  fastify.get('/me', async (request, reply) => {
    return {
      success: true,
      user: request.user
    };
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
