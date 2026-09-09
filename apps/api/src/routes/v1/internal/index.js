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

  // Session bootstrap for cookie-based web clients: since access_token is httpOnly,
  // the frontend can't tell it's logged in by reading a cookie — it calls this on load
  // instead. A 401 here (via authenticateJWT above) means "not logged in."
  fastify.get('/me', async (request, reply) => {
    const roleAssignmentRepository = container.resolve('RoleAssignmentRepository');
    const tenants = await roleAssignmentRepository.findTenantsWithRolesForUser(
      request.user.userId || request.user.sub
    );

    return {
      success: true,
      user: request.user,
      tenants
    };
  });

  // Tenant Provisioning Route
  fastify.post(
    '/tenants',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            name: { type: 'string', minLength: 1 },
            slug: { type: 'string', minLength: 3 },
            orgName: { type: 'string' },
            orgCode: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreateTenantUseCase');
      // Owner is always the authenticated caller — never trust a client-supplied ownerUserId,
      // or any user could provision a tenant "owned" by someone else's account.
      const result = await useCase.execute({ ...request.body, ownerUserId: request.user.userId });

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
