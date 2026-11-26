const { mediaUrlsForCourse } = require('../../mediaAccess');
const { learningDomain, infraMail } = require('../../../bootstrap/domain-bridge');
const { getPasswordResetBaseUrl } = infraMail;
const { queueEnrollmentInvitation, serializeEnrollment } = require('../enrollmentInvitation');
const { STUDENT_ACTIVATION_TYPE, activationPasswordHash } = learningDomain.application;
const { setAuthCookies, clearAuthCookies, generateCsrfToken } = require('../../../middleware/authCookies');

const passwordResetRequestAcknowledgment = {
  success: true,
  message: 'If an account exists with that email, you will receive a password reset link.'
};

function verifyStudentActivation(tokenService, token) {
  const decoded = tokenService.verifyToken(token);
  if (decoded?.type === STUDENT_ACTIVATION_TYPE && typeof decoded.nonce === 'string' &&
      /^[0-9a-f]{64}$/.test(decoded.nonce)) {
    return decoded;
  }
  return null;
}

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

  // Public Tenant Lookup by Slug
  fastify.get(
    '/tenants/:slug',
    async (request, reply) => {
      try {
        const tenantRepository = container.resolve('TenantRepository');
        const normalizedSlug = slugify(request.params.slug || '');
        const tenant = await tenantRepository.findBySlug(normalizedSlug);
        if (!tenant) {
          return reply.status(404).send({ success: false, error: 'Institution not found' });
        }
        return reply.status(200).send({
          success: true,
          data: {
            id: tenant.id,
            name: tenant.name,
            slug: typeof tenant.slug === 'object' ? (tenant.slug?.value || tenant.slug?.props?.value || normalizedSlug) : (tenant.slug || normalizedSlug),
            settings: tenant.settingsJson || tenant.settings_json || {}
          }
        });
      } catch (err) {
        return reply.status(500).send({ success: false, error: err.message });
      }
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
      const decoded = verifyStudentActivation(tokenService, request.query.token);
      const user = decoded && await container.resolve('UserRepository').findById(decoded.userId);
      if (!user || user.status !== 'ACTIVE' || (user.email?.value || user.email) !== decoded.email ||
          user.passwordHash !== activationPasswordHash(decoded.nonce)) {
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

      return reply.send({
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        name: user.name,
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
      const decoded = verifyStudentActivation(tokenService, request.body.token);
      if (!decoded) {
        return reply.status(400).send({
          success: false,
          error: 'Activation token is invalid or has expired.'
        });
      }

      const passwordHasher = container.resolve('PasswordHasher');
      const userRepo = container.resolve('UserRepository');
      const newHash = await passwordHasher.hash(request.body.password);

      const consumed = await userRepo.consumeStudentActivation(
        decoded.userId, decoded.email, activationPasswordHash(decoded.nonce), newHash
      );
      if (!consumed) {
        return reply.status(400).send({
          success: false,
          error: 'Activation token is invalid or has expired.'
        });
      }

      const roleAssignmentRepository = container.resolve('RoleAssignmentRepository');
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

  // Queue password reset delivery. The response does not depend on account existence.
  fastify.post(
    '/auth/forgot-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        }
      }
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      reply.header('Cache-Control', 'no-store');

      try {
        getPasswordResetBaseUrl();
      } catch (err) {
        request.log.error(err.message);
        return reply.send(passwordResetRequestAcknowledgment);
      }

      try {
        const user = await container.resolve('UserRepository').findByEmail(email);
        if (user) {
          const recipient = user.email?.value || user.email;
          const resetToken = container.resolve('TokenService').generateToken(
            { userId: user.id, email: recipient, type: 'password_reset' },
            { expiresIn: '1h' }
          );
          await container.resolve('OutboxRepository').create({
            eventName: 'PasswordResetRequested',
            aggregateType: 'User',
            aggregateId: user.id,
            payload: {
              email: recipient,
              name: user.name || recipient.split('@')[0],
              resetToken
            }
          });
        }
      } catch {
        request.log.error('Failed to queue password reset email.');
      }

      return reply.send(passwordResetRequestAcknowledgment);
    }
  );

  async function verifyResetToken(request, reply) {
    reply.header('Cache-Control', 'no-store');
    const token = request.method === 'POST' ? request.body.token : request.query.token;
    const decoded = container.resolve('TokenService').verifyToken(token);
    if (!decoded || decoded.type !== 'password_reset') {
      return reply.status(400).send({
        success: false,
        error: 'Password reset link is invalid or has expired. Please request a new one.'
      });
    }

    const user = await container.resolve('UserRepository').findById(decoded.userId);
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: 'Account associated with this link could not be found.'
      });
    }

    return reply.send({
      success: true,
      userId: decoded.userId,
      email: decoded.email,
      name: user.name
    });
  }

  const resetTokenSchema = {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string', minLength: 1 }
    }
  };
  fastify.post('/auth/verify-reset-token', { schema: { body: resetTokenSchema } }, verifyResetToken);
  fastify.get('/auth/verify-reset-token', { schema: { querystring: resetTokenSchema } }, verifyResetToken);

  // Reset Password with Verified Token
  fastify.post(
    '/auth/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 8 }
          }
        }
      }
    },
    async (request, reply) => {
      const { token, password } = request.body;
      const tokenService = container.resolve('TokenService');
      const decoded = tokenService.verifyToken(token);
      if (!decoded || decoded.type !== 'password_reset') {
        return reply.status(400).send({
          success: false,
          error: 'Password reset link is invalid or has expired. Please request a new one.'
        });
      }

      const passwordHasher = container.resolve('PasswordHasher');
      const userRepo = container.resolve('UserRepository');
      const newHash = await passwordHasher.hash(password);

      if (typeof userRepo.updatePassword === 'function') {
        await userRepo.updatePassword(decoded.userId, newHash);
      } else {
        const user = await userRepo.findById(decoded.userId);
        if (user) {
          user.updatePassword(newHash);
          await userRepo.save(user);
        }
      }

      // Security practice: Revoke all existing sessions for this user
      try {
        const userSessionRepository = container.resolve('UserSessionRepository');
        if (userSessionRepository && typeof userSessionRepository.revokeAllForUser === 'function') {
          await userSessionRepository.revokeAllForUser(decoded.userId);
        }
      } catch (sessionErr) {
        request.log.warn(`[ResetPassword] Failed to revoke active sessions for user ${decoded.userId}: ${sessionErr.message}`);
      }

      return reply.status(200).send({
        success: true,
        message: 'Your password has been successfully reset. You can now sign in with your new password.'
      });
    }
  );

  // ---------------------------------------------------------------------------
  // PUBLIC TENANT STOREFRONT ENDPOINTS
  // ---------------------------------------------------------------------------

  // 1. Get Tenant Public Storefront Profile
  fastify.get(
    '/storefront/:slug',
    {
      schema: {
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { slug } = request.params;
      const tenantRepo = container.resolve('TenantRepository');
      const tenant = await tenantRepo.findBySlug(slug);

      if (!tenant || tenant.status === 'ARCHIVED' || tenant.status === 'SUSPENDED') {
        return reply.status(404).send({
          success: false,
          error: 'Institution storefront not found.'
        });
      }

      const settings = tenant.settingsJson || {};
      return reply.status(200).send({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug?.value || tenant.slug,
          status: tenant.status,
          branding: {
            tagline: settings.tagline || 'Excellence in Online Education',
            description: settings.description || 'Explore industry-leading courses and certifications designed by our expert faculty.',
            primaryColor: settings.primaryColor || '#6366f1',
            accentColor: settings.accentColor || '#10b981',
            logoUrl: settings.logoUrl || null,
            bannerUrl: settings.bannerUrl || null,
            socialProof: settings.socialProof || {
              studentsCount: '10,000+',
              coursesCount: '25+',
              completionRate: '94%'
            }
          }
        }
      });
    }
  );

  // 2. List Public Courses for Tenant Storefront
  fastify.get(
    '/storefront/:slug/courses',
    {
      schema: {
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { slug } = request.params;
      const tenantRepo = container.resolve('TenantRepository');
      const tenant = await tenantRepo.findBySlug(slug);

      if (!tenant || tenant.status === 'ARCHIVED' || tenant.status === 'SUSPENDED') {
        return reply.status(404).send({
          success: false,
          error: 'Institution storefront not found.'
        });
      }

      const courseRepo = container.resolve('CourseRepository');
      const courses = await courseRepo.findByTenantId(tenant.id);

      const publicCourses = (courses || [])
        .filter((c) => c && c.visibility !== 'PRIVATE')
        .map((c) => {
          const props = c.props || {};
          return {
            id: c.id,
            title: c.title,
            code: c.code?.value || c.code,
            slug: c.slug || slugify(c.title),
            shortDescription: c.shortDescription || '',
            description: c.description || '',
            level: c.level || 'ALL_LEVELS',
            language: c.language || 'en',
            credits: c.credits || 3,
            thumbnailUrl: c.thumbnailUrl || null,
            price: props.price !== undefined ? props.price : 4900,
            currency: props.currency || 'USD'
          };
        });

      return reply.status(200).send({
        success: true,
        count: publicCourses.length,
        courses: publicCourses
      });
    }
  );

  // 3. Get Single Public Course with Modules Syllabus
  fastify.get(
    '/storefront/:slug/courses/:courseId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['slug', 'courseId'],
          properties: {
            slug: { type: 'string' },
            courseId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { slug, courseId } = request.params;
      const tenantRepo = container.resolve('TenantRepository');
      const tenant = await tenantRepo.findBySlug(slug);

      if (!tenant || tenant.status === 'ARCHIVED' || tenant.status === 'SUSPENDED') {
        return reply.status(404).send({
          success: false,
          error: 'Institution storefront not found.'
        });
      }

      const courseRepo = container.resolve('CourseRepository');
      let course = await courseRepo.findById(courseId);
      if (!course) {
        course = await courseRepo.findByCode(tenant.id, courseId);
      }

      if (!course || course.tenantId !== tenant.id || course.visibility === 'PRIVATE') {
        return reply.status(404).send({
          success: false,
          error: 'Course not found in this institution.'
        });
      }

      const moduleRepo = container.resolve('LessonModuleRepository');
      const modules = await moduleRepo.findByCourseId(course.id);

      const previewUrls = (modules || []).filter((module, index) => index === 0 || module.props?.isPreview)
        .map((module) => module.contentUrl).filter(Boolean);
      const managedMedia = previewUrls.length
        ? await mediaUrlsForCourse(container.resolve('DatabaseClient'), course.tenantId, previewUrls)
        : new Map();

      const publicModules = (modules || []).map((m, idx) => {
        const isPreview = Boolean((idx === 0 || m.props?.isPreview) && m.contentUrl &&
          !managedMedia.has(m.contentUrl) && !/(?:^|\/)uploads\//.test(m.contentUrl));
        return {
          id: m.id,
          title: m.title,
          contentType: m.contentType || 'VIDEO',
          order: m.order || idx + 1,
          isPreview,
          contentUrl: isPreview ? m.contentUrl : null
        };
      });

      const props = course.props || {};
      return reply.status(200).send({
        success: true,
        course: {
          id: course.id,
          title: course.title,
          code: course.code?.value || course.code,
          slug: course.slug || slugify(course.title),
          shortDescription: course.shortDescription || '',
          description: course.description || '',
          level: course.level || 'ALL_LEVELS',
          language: course.language || 'en',
          credits: course.credits || 3,
          thumbnailUrl: course.thumbnailUrl || null,
          price: props.price !== undefined ? props.price : 4900,
          currency: props.currency || 'USD',
          modulesCount: publicModules.length,
          modules: publicModules
        }
      });
    }
  );

  // 4. Enroll Student into Course (Storefront direct enrollment / checkout webhook target)
  fastify.post(
    '/storefront/:slug/enroll',
    {
      schema: {
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['courseId', 'email'],
          properties: {
            courseId: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { slug } = request.params;
      const { courseId, email, name } = request.body;

      const tenantRepo = container.resolve('TenantRepository');
      const tenant = await tenantRepo.findBySlug(slug);
      if (tenant?.status !== 'ACTIVE') {
        return reply.status(404).send({
          success: false,
          error: 'Institution storefront not found.'
        });
      }

      const courseRepo = container.resolve('CourseRepository');
      const course = await courseRepo.findById(courseId);
      if (!course || course.tenantId !== tenant.id || course.visibility !== 'PUBLIC' ||
          !['PUBLISHED', 'ACTIVE'].includes(course.status)) {
        return reply.status(404).send({
          success: false,
          error: 'Course not found in this institution.'
        });
      }

      const enrollUseCase = container.resolve('EnrollStudentUseCase');
      const enrollRes = await enrollUseCase.execute({
        tenantId: tenant.id,
        courseId: course.id,
        studentEmail: email,
        studentName: name || email.split('@')[0]
      });

      if (enrollRes.isFailure) {
        return reply.status(400).send({
          success: false,
          error: enrollRes.error
        });
      }

      const enrollment = enrollRes.getValue();
      const invitationQueued = await queueEnrollmentInvitation({ container, request, enrollment, course });
      return reply.status(201).send({
        success: true,
        message: invitationQueued ? 'Successfully enrolled. Please check your email for access instructions.' : 'Successfully enrolled.',
        enrollment: serializeEnrollment(enrollment)
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GLOBAL PUBLIC CATALOG COURSES
  // ---------------------------------------------------------------------------

  // 5. Global Public Courses Catalog
  fastify.get(
    '/courses',
    async (request, reply) => {
      try {
        const { search, tenantId, tenantSlug, level, limit = 50, offset = 0 } = request.query || {};
        const courseRepo = container.resolve('CourseRepository');
        const tenantRepo = container.resolve('TenantRepository');

        let targetTenantId = tenantId;
        if (!targetTenantId && tenantSlug) {
          const tenant = await tenantRepo.findBySlug(tenantSlug);
          if (tenant) targetTenantId = tenant.id;
        }

        const rawCourses = await courseRepo.findByTenantId(targetTenantId || null);

        // Map and filter public courses
        const tenantCache = new Map();
        const formatted = [];

        for (const c of rawCourses || []) {
          if (!c || c.visibility === 'PRIVATE' || c.status === 'ARCHIVED') continue;

          // Level filter
          if (level && level !== 'ALL' && level !== 'ALL_LEVELS') {
            if (c.level !== level) continue;
          }

          // Search filter
          if (search) {
            const q = search.toLowerCase();
            const titleMatch = (c.title || '').toLowerCase().includes(q);
            const codeMatch = (c.code?.value || c.code || '').toLowerCase().includes(q);
            const descMatch = (c.shortDescription || c.description || '').toLowerCase().includes(q);
            if (!titleMatch && !codeMatch && !descMatch) continue;
          }

          // Resolve tenant info
          let tenantInfo = null;
          if (c.tenantId) {
            if (tenantCache.has(c.tenantId)) {
              tenantInfo = tenantCache.get(c.tenantId);
            } else {
              try {
                const t = await tenantRepo.findById(c.tenantId);
                if (t) {
                  tenantInfo = {
                    id: t.id,
                    name: t.name,
                    slug: t.slug?.value || t.slug
                  };
                }
              } catch (e) {}
              tenantCache.set(c.tenantId, tenantInfo);
            }
          }

          const props = c.props || {};
          formatted.push({
            id: c.id,
            tenantId: c.tenantId,
            title: c.title,
            code: c.code?.value || c.code,
            slug: c.slug || slugify(c.title),
            shortDescription: c.shortDescription || '',
            description: c.description || '',
            thumbnailUrl: c.thumbnailUrl || null,
            level: c.level || 'ALL_LEVELS',
            language: c.language || 'en',
            credits: c.credits !== undefined ? c.credits : 3,
            status: c.status,
            price: props.price !== undefined ? props.price : 4900,
            currency: props.currency || 'USD',
            institution: tenantInfo || {
              id: c.tenantId || 'apex-sys',
              name: 'Autonomous Campus Branch',
              slug: 'campus'
            },
            teacher: {
              name: 'Academic Faculty',
              title: 'Lead Instructor'
            }
          });
        }

        // Aggregate unique institutions with course count
        const instMap = new Map();
        for (const c of formatted) {
          const inst = c.institution;
          if (inst && inst.id) {
            if (!instMap.has(inst.id)) {
              instMap.set(inst.id, {
                id: inst.id,
                name: inst.name,
                slug: inst.slug,
                courseCount: 1
              });
            } else {
              instMap.get(inst.id).courseCount += 1;
            }
          }
        }

        return reply.status(200).send({
          success: true,
          count: formatted.length,
          data: formatted.slice(Number(offset), Number(offset) + Number(limit)),
          institutions: Array.from(instMap.values())
        });
      } catch (err) {
        request.log.error(`Public courses fetch error: ${err.message}`);
        return reply.status(500).send({
          success: false,
          error: err.message,
          data: [],
          institutions: []
        });
      }
    }
  );

  // 6. Get Single Public Course by ID
  fastify.get(
    '/courses/:courseId',
    async (request, reply) => {
      try {
        const { courseId } = request.params;
        const courseRepo = container.resolve('CourseRepository');
        const tenantRepo = container.resolve('TenantRepository');
        const moduleRepo = container.resolve('LessonModuleRepository');

        let course = await courseRepo.findById(courseId);
        if (!course) {
          // Try lookup across tenants by code
          const allCourses = await courseRepo.findByTenantId(null);
          course = (allCourses || []).find(
            (c) => c && (c.id === courseId || (c.code?.value || c.code) === courseId || c.slug === courseId)
          );
        }

        if (!course || course.visibility === 'PRIVATE' || course.status === 'ARCHIVED') {
          return reply.status(404).send({
            success: false,
            error: 'Course not found'
          });
        }

        let tenantInfo = null;
        if (course.tenantId) {
          try {
            const t = await tenantRepo.findById(course.tenantId);
            if (t) {
              tenantInfo = {
                id: t.id,
                name: t.name,
                slug: t.slug?.value || t.slug
              };
            }
          } catch (e) {}
        }

        let modules = [];
        try {
          if (moduleRepo && typeof moduleRepo.findByCourseId === 'function') {
            const rawModules = await moduleRepo.findByCourseId(course.id);
            modules = (rawModules || []).map((m, idx) => ({
              id: m.id,
              title: m.title,
              contentType: m.contentType || 'VIDEO',
              order: m.order || idx + 1,
              isPreview: idx === 0 || Boolean(m.props?.isPreview)
            }));
          }
        } catch (mErr) {}

        const props = course.props || {};
        return reply.status(200).send({
          success: true,
          data: {
            id: course.id,
            tenantId: course.tenantId,
            title: course.title,
            code: course.code?.value || course.code,
            slug: course.slug || slugify(course.title),
            shortDescription: course.shortDescription || '',
            description: course.description || '',
            thumbnailUrl: course.thumbnailUrl || null,
            level: course.level || 'ALL_LEVELS',
            language: course.language || 'en',
            credits: course.credits !== undefined ? course.credits : 3,
            status: course.status,
            price: props.price !== undefined ? props.price : 4900,
            currency: props.currency || 'USD',
            institution: tenantInfo || {
              id: course.tenantId || 'apex-sys',
              name: 'Autonomous Campus Branch',
              slug: 'campus'
            },
            teacher: {
              name: 'Academic Faculty',
              title: 'Lead Instructor'
            },
            modules
          }
        });
      } catch (err) {
        request.log.error(`Public course detail error: ${err.message}`);
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );
}

module.exports = publicRoutes;
