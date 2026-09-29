const { setAuthCookies, clearAuthCookies, generateCsrfToken } = require('../../../middleware/authCookies');

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

      // Web clients: httpOnly cookies (see docs/auth_and_authorization.md). Mobile/API
      // clients that ignore Set-Cookie still get the tokens in the body below.
      const csrfToken = generateCsrfToken();
      setAuthCookies(reply, { accessToken: data.accessToken, refreshToken: data.refreshToken, csrfToken });

      return reply.status(200).send({
        success: true,
        token: data.token,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        csrfToken,
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
          properties: {
            refreshToken: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      // Cookie-based web clients never put it in the body; mobile/API clients do.
      const refreshToken = request.cookies.refresh_token || (request.body && request.body.refreshToken);

      const useCase = container.resolve('RefreshTokenUseCase');
      const result = await useCase.execute({
        refreshToken,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip
      });

      if (result.isFailure) {
        clearAuthCookies(reply);
        return reply.status(401).send({ success: false, error: result.error });
      }

      const data = result.getValue();
      const csrfToken = generateCsrfToken();
      setAuthCookies(reply, { accessToken: data.accessToken, refreshToken: data.refreshToken, csrfToken });

      return reply.status(200).send({
        success: true,
        token: data.token,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        csrfToken
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
          properties: {
            refreshToken: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refresh_token || (request.body && request.body.refreshToken);
      const useCase = container.resolve('LogoutUseCase');
      const result = await useCase.execute({ refreshToken });

      clearAuthCookies(reply);

      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      return reply.status(200).send({ success: true });
    }
  );

  // Slug Availability Check Route
  fastify.get(
    '/auth/check-slug',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const tenantRepository = container.resolve('TenantRepository');
      const normalizedSlug = slugify(request.query.slug || '');
      if (normalizedSlug.length < 3) {
        return reply.status(200).send({
          success: true,
          slug: normalizedSlug,
          available: false,
          reason: 'Subdomain must be at least 3 characters'
        });
      }

      const existingTenant = await tenantRepository.findBySlug(normalizedSlug);
      return reply.status(200).send({
        success: true,
        slug: normalizedSlug,
        available: !existingTenant
      });
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
            institutionName: { type: 'string' },
            slug: { type: 'string' },
            branchName: { type: 'string' },
            phone: { type: 'string' },
            timezone: { type: 'string' },
            language: { type: 'string' },
            settingsJson: { type: 'object' }
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

      // Auto-provision tenant workspace with custom branding & settings
      const createTenantUseCase = container.resolve('CreateTenantUseCase');
      const institutionName = (request.body.institutionName && request.body.institutionName.trim()) || `${registeredUser.name}'s Workspace`;
      const requestedSlug = request.body.slug && slugify(request.body.slug);
      const slugSuffix = registeredUser.id.replace(/-/g, '').slice(0, 6);
      const finalSlug = requestedSlug && requestedSlug.length >= 3 ? requestedSlug : `${slugify(institutionName)}-${slugSuffix}`;

      const tenantResult = await createTenantUseCase.execute({
        name: institutionName,
        slug: finalSlug,
        ownerUserId: registeredUser.id,
        orgName: request.body.branchName || 'Main Campus',
        settingsJson: request.body.settingsJson || {}
      });

      if (tenantResult.isFailure) {
        request.log.warn(`Auto tenant provisioning failed for user ${registeredUser.id}: ${tenantResult.error}`);
      }

      // Persist Transactional Outbox Event for async worker dispatch (e.g. welcome email)
      try {
        const outboxRepo = container.resolve('OutboxRepository');
        await outboxRepo.create({
          eventName: 'UserRegistered',
          aggregateType: 'User',
          aggregateId: registeredUser.id,
          payload: {
            id: registeredUser.id,
            email: registeredUser.email,
            name: registeredUser.name,
            tenantId: tenantResult.isSuccess && tenantResult.getValue().tenant ? tenantResult.getValue().tenant.id : null
          }
        });
      } catch (outboxErr) {
        request.log.warn(`Failed to persist outbox event for user ${registeredUser.id}: ${outboxErr.message}`);
      }

      return reply.status(201).send({
        success: true,
        data: registeredUser,
        tenant: tenantResult.isSuccess ? tenantResult.getValue().tenant : null
      });
    }
  );

  // Verify Student Activation Token
  fastify.get(
    '/auth/verify-activation-token',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const tokenService = container.resolve('TokenService');
      const decoded = tokenService.verifyToken(request.query.token);
      if (!decoded || decoded.type !== 'student_activation') {
        return reply.status(400).send({
          success: false,
          error: 'Activation token is invalid or has expired.'
        });
      }

      let tenantName = 'EducationOS Campus';
      try {
        const tenantRepo = container.resolve('TenantRepository');
        const tenant = await tenantRepo.findById(decoded.tenantId);
        if (tenant) tenantName = tenant.name;
      } catch (e) {}

      let userName = '';
      try {
        const userRepo = container.resolve('UserRepository');
        const user = await userRepo.findById(decoded.userId);
        if (user) userName = user.name;
      } catch (e) {}

      return reply.send({
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        name: userName,
        tenantId: decoded.tenantId,
        tenantName
      });
    }
  );

  // Student Account Activation / Set Password
  fastify.post(
    '/auth/activate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 6 }
          }
        }
      }
    },
    async (request, reply) => {
      const tokenService = container.resolve('TokenService');
      const decoded = tokenService.verifyToken(request.body.token);
      if (!decoded || decoded.type !== 'student_activation') {
        return reply.status(400).send({
          success: false,
          error: 'Activation token is invalid or has expired.'
        });
      }

      const passwordHasher = container.resolve('PasswordHasher');
      const userRepo = container.resolve('UserRepository');
      const newHash = await passwordHasher.hash(request.body.password);

      if (typeof userRepo.updatePassword === 'function') {
        await userRepo.updatePassword(decoded.userId, newHash);
      } else {
        const user = await userRepo.findById(decoded.userId);
        if (user) {
          user.updatePassword(newHash);
          await userRepo.save(user);
        }
      }

      // Ensure STUDENT role assignment
      const roleAssignmentRepository = container.resolve('RoleAssignmentRepository');
      if (roleAssignmentRepository && typeof roleAssignmentRepository.assignRole === 'function') {
        try {
          await roleAssignmentRepository.assignRole({
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            roleName: 'STUDENT'
          });
        } catch (e) {}
      }

      const user = await userRepo.findById(decoded.userId);
      const tenants = await roleAssignmentRepository.findTenantsWithRolesForUser(decoded.userId);

      const accessToken = tokenService.generateToken(
        {
          userId: decoded.userId,
          email: decoded.email,
          name: user ? user.name : decoded.email.split('@')[0]
        },
        { expiresIn: '15m' }
      );

      const crypto = require('crypto');
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const userSessionRepository = container.resolve('UserSessionRepository');
      if (userSessionRepository) {
        await userSessionRepository.create({
          id: crypto.randomUUID(),
          userId: decoded.userId,
          refreshTokenHash,
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }

      const csrfToken = generateCsrfToken();
      setAuthCookies(reply, { accessToken, refreshToken, csrfToken });

      return reply.status(200).send({
        success: true,
        message: 'Account activated successfully.',
        accessToken,
        refreshToken,
        csrfToken,
        token: accessToken,
        user: {
          id: decoded.userId,
          email: decoded.email,
          name: user ? user.name : decoded.email.split('@')[0]
        },
        tenants,
        tenantId: decoded.tenantId
      });
    }
  );
}

module.exports = publicRoutes;
