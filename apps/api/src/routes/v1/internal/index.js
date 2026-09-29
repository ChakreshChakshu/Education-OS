const academicsRoutes = require('./academics');
const learningRoutes = require('./learning');
const mediaRoutes = require('./media');
const usersRoutes = require('./users');
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
  await fastify.register(usersRoutes, { prefix: '/users', container });

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

  // Get Current Active Tenant Details
  fastify.get('/tenants/current', async (request, reply) => {
    const tenantRepo = container.resolve('TenantRepository');
    let tenantId = request.headers['x-tenant-id'];

    if (!tenantId) {
      const roleAssignmentRepository = container.resolve('RoleAssignmentRepository');
      const userTenants = await roleAssignmentRepository.findTenantsWithRolesForUser(
        request.user.userId || request.user.sub
      );
      if (userTenants && userTenants.length > 0) {
        tenantId = userTenants[0].id;
      }
    }

    if (!tenantId) {
      return reply.status(404).send({ success: false, error: 'No active tenant workspace found' });
    }

    const tenant = await tenantRepo.findById(tenantId);
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

  // Update Current Active Tenant Settings & Branding
  fastify.route({
    method: ['PATCH', 'PUT'],
    url: '/tenants/current/settings',
    schema: {
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          name: { type: 'string', minLength: 1 },
          settingsJson: { type: 'object' }
        }
      }
    },
    handler: async (request, reply) => {
      let tenantId = request.body.tenantId || request.headers['x-tenant-id'];

      if (!tenantId) {
        const roleAssignmentRepository = container.resolve('RoleAssignmentRepository');
        const userTenants = await roleAssignmentRepository.findTenantsWithRolesForUser(
          request.user.userId || request.user.sub
        );
        if (userTenants && userTenants.length > 0) {
          tenantId = userTenants[0].id;
        }
      }

      if (!tenantId) {
        return reply.status(400).send({ success: false, error: 'Tenant ID is required' });
      }

      const useCase = container.resolve('UpdateTenantSettingsUseCase');
      const result = await useCase.execute({
        tenantId,
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

