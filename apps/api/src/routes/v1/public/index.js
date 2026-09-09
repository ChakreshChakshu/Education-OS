function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function publicRoutes(fastify, options) {
  const container = options.container;

  fastify.get('/ping', async (request, reply) => {
    return { status: 'pong' };
  });

  // User Login Route (Bcrypt Hash Check & Real JWT Generation)
  fastify.post(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string' },
            password: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('LoginUserUseCase');
      const result = await useCase.execute({
        ...request.body,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip
      });

      if (result.isFailure) {
        return reply.status(401).send({
          success: false,
          error: result.error
        });
      }

      const data = result.getValue();
      return reply.status(200).send({
        success: true,
        token: data.token,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tenants: data.tenants,
        // `data` kept for backward compatibility; `user` is the field the web client actually reads.
        data: data.user,
        user: data.user
      });
    }
  );

  // Refresh Access Token Route (Opaque Refresh Token Rotation)
  fastify.post(
    '/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('RefreshTokenUseCase');
      const result = await useCase.execute({
        refreshToken: request.body.refreshToken,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip
      });

      if (result.isFailure) {
        return reply.status(401).send({ success: false, error: result.error });
      }

      const data = result.getValue();
      return reply.status(200).send({
        success: true,
        token: data.token,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
    }
  );

  // Logout Route (Single Device Session Revocation)
  fastify.post(
    '/auth/logout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('LogoutUseCase');
      const result = await useCase.execute({ refreshToken: request.body.refreshToken });

      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      return reply.status(200).send({ success: true });
    }
  );

  // User Registration Route (Bcrypt Password Hashing & Neon Database Save)
  fastify.post(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 1 },
            phone: { type: 'string' },
            timezone: { type: 'string' },
            language: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('RegisterUserUseCase');
      const result = await useCase.execute(request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error
        });
      }

      const registeredUser = result.getValue();

      // Auto-provision a default tenant workspace so a fresh signup has real
      // multi-tenant scoping immediately, instead of relying on a client-side
      // placeholder tenant ID (see docs/multi_tenant_architecture.md).
      const createTenantUseCase = container.resolve('CreateTenantUseCase');
      const institutionName = request.body.institutionName && request.body.institutionName.trim();
      const tenantName = institutionName || `${registeredUser.name}'s Workspace`;
      const slugSuffix = registeredUser.id.replace(/-/g, '').slice(0, 8);
      const tenantResult = await createTenantUseCase.execute({
        name: tenantName,
        slug: `${slugify(tenantName)}-${slugSuffix}`,
        ownerUserId: registeredUser.id
      });

      if (tenantResult.isFailure) {
        request.log.warn(`Auto tenant provisioning failed for user ${registeredUser.id}: ${tenantResult.error}`);
      }

      return reply.status(201).send({
        success: true,
        data: registeredUser,
        tenant: tenantResult.isSuccess ? tenantResult.getValue().tenant : null
      });
    }
  );
}

module.exports = publicRoutes;
