const academicsRoutes = require('./academics');
const learningRoutes = require('./learning');
const mediaRoutes = require('./media');
const usersRoutes = require('./users');
const { authenticateJWT } = require('../../../middleware/auth');
const { authorize } = require('../../../middleware/authorize');
const {
  resolveTenantScope,
  requireTenant,
  isDevAuthBypassEnabled
} = require('../../../middleware/tenantScope');

async function internalRoutes(fastify, options) {
  const container = options.container;

  fastify.addHook('onRequest', async (request, reply) => {
    request.container = container;
  });

  fastify.addHook('onRequest', authenticateJWT);

  // Raw x-tenant-id is only a hint; it is validated against actual memberships.
  fastify.addHook('preHandler', resolveTenantScope);

  await fastify.register(academicsRoutes, { prefix: '/academics', container });
  await fastify.register(learningRoutes, { prefix: '/learning', container });
  await fastify.register(mediaRoutes, { prefix: '/media', container });
  await fastify.register(usersRoutes, { prefix: '/users', container });

  fastify.get('/health', async (request, reply) => {
    const healthService = container.resolve('HealthService');
    return healthService.getHealth();
  });

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

  fastify.get('/tenants/current', async (request, reply) => {
    if (!requireTenant(request, reply)) {
      return;
    }

    const tenantRepo = container.resolve('TenantRepository');
    const tenant = await tenantRepo.findById(request.tenantId);

    if (!tenant) {
      return reply.status(404).send({ success: false, error: 'Tenant not found' });
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug ? tenant.slug.value : '',
        status: tenant.status,
        settingsJson: tenant.settingsJson || {},
        updatedAt: tenant.updatedAt
      }
    };
  });

  fastify.route({
    method: ['PATCH', 'PUT'],
    url: '/tenants/current/settings',
    preHandler: authorize('tenant.manage'),
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          settingsJson: { type: 'object' }
        }
      }
    },
    handler: async (request, reply) => {
      if (!requireTenant(request, reply)) {
        return;
      }

      const useCase = container.resolve('UpdateTenantSettingsUseCase');
      const result = await useCase.execute({
        tenantId: request.tenantId,
        name: request.body.name,
        settingsJson: request.body.settingsJson
      });

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.getValue()
      });
    }
  });

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

      const callerUserId = request.user?.userId || request.user?.sub;
      const ownerUserId =
        (isDevAuthBypassEnabled() && request.body.ownerUserId) || callerUserId;

      if (!ownerUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized: no authenticated user' });
      }

      const result = await useCase.execute({ ...request.body, ownerUserId });

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

