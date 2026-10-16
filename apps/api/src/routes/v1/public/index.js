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

  // Request Password Reset Link (Sends email via Resend)
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
      const email = request.body.email?.trim().toLowerCase();
      if (!email) {
        return reply.status(400).send({
          success: false,
          error: 'A valid email address is required.'
        });
      }

      const userRepo = container.resolve('UserRepository');
      const tokenService = container.resolve('TokenService');
      const mailProvider = container.resolve('MailProvider');

      let devResetUrl = null;
      let mailError = null;
      let userFound = false;

      try {
        const user = await userRepo.findByEmail(email);
        if (user) {
          userFound = true;
          const userEmailStr = typeof user.email === 'string' ? user.email : (user.email?.value || email);
          const resetToken = tokenService.generateToken(
            {
              userId: user.id,
              email: userEmailStr,
              type: 'password_reset'
            },
            { expiresIn: '1h' }
          );

          const requestOrigin = request.headers.origin || request.headers.referer;
          const originBase = requestOrigin ? requestOrigin.replace(/\/$/, '') : null;
          const appUrl = process.env.APP_URL || originBase || 'http://localhost:3000';
          const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
          devResetUrl = resetLink;
          const recipientName = user.name || userEmailStr.split('@')[0];

          if (process.env.NODE_ENV !== 'production') {
            console.log(`\n======================================================`);
            console.log(`🔑 [PASSWORD RESET LINK GENERATED]`);
            console.log(`👤 Recipient: ${userEmailStr}`);
            console.log(`🔗 Link: ${resetLink}`);
            console.log(`======================================================\n`);
          }

          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background-color: #ffffff; color: #1e293b; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div style="margin-bottom: 24px; text-align: center;">
                <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 8px 18px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 0.5px;">EDUCATION OS</div>
              </div>
              <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; text-align: center;">Password Reset Request</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                Hello <strong>${recipientName}</strong>,<br/><br/>
                We received a request to reset the password for your EducationOS account. Click the button below to choose a new password:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 4px 0 rgba(37, 99, 235, 0.2);">
                  Reset Your Password
                </a>
              </div>
              <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 20px;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #2563eb; font-family: monospace; margin-bottom: 28px;">
                ${resetLink}
              </div>
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  This link is valid for <strong>1 hour</strong>. If you did not request this password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>
            </div>
          `;

          const text = `Hello ${recipientName},\n\nWe received a request to reset your password for EducationOS.\nPlease use the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nEducationOS Team`;

          try {
            await mailProvider.sendMail({
              to: userEmailStr,
              subject: 'Reset Your EducationOS Password',
              html,
              text
            });
            request.log.info(`[ForgotPassword] Sent password reset link to ${userEmailStr}`);
          } catch (mErr) {
            mailError = mErr.message;
            request.log.warn(`[ForgotPassword] Mail provider error for ${userEmailStr}: ${mErr.message}`);
          }

          // Persist Transactional Outbox Event for background processing & audit trail
          try {
            const outboxRepo = container.resolve('OutboxRepository');
            if (outboxRepo && typeof outboxRepo.create === 'function') {
              await outboxRepo.create({
                eventName: 'PasswordResetRequested',
                aggregateType: 'User',
                aggregateId: user.id,
                payload: {
                  userId: user.id,
                  email: userEmailStr,
                  name: recipientName,
                  resetUrl: resetLink
                }
              });
            }
          } catch (outboxErr) {
            request.log.warn(`[ForgotPassword] Failed to record outbox event for user ${user.id}: ${outboxErr.message}`);
          }
        } else {
          request.log.info(`[ForgotPassword] No account found with email ${email}`);
        }
      } catch (err) {
        request.log.error(`[ForgotPassword] Error processing request: ${err.message}`);
      }

      const isDev = process.env.NODE_ENV !== 'production';
      return reply.status(200).send({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent to your inbox.',
        ...(isDev && userFound ? { devResetUrl } : {}),
        ...(isDev && mailError ? { mailError } : {}),
        ...(isDev && !userFound ? { devWarning: `No registered account found with email: ${email}` } : {})
      });
    }
  );

  // Verify Password Reset Token
  fastify.get(
    '/auth/verify-reset-token',
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
      if (!decoded || decoded.type !== 'password_reset') {
        return reply.status(400).send({
          success: false,
          error: 'Password reset link is invalid or has expired. Please request a new one.'
        });
      }

      let userName = '';
      try {
        const userRepo = container.resolve('UserRepository');
        const user = await userRepo.findById(decoded.userId);
        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'Account associated with this link could not be found.'
          });
        }
        userName = user.name;
      } catch (e) {}

      return reply.send({
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        name: userName
      });
    }
  );

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
}

module.exports = publicRoutes;
