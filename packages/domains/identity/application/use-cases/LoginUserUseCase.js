const crypto = require('crypto');
const { Result } = require('../../core');
const { Email } = require('../../domain/value-objects/Email');

class LoginUserUseCase {
  constructor({ userRepository, passwordHasher, tokenService, userSessionRepository, roleAssignmentRepository }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
    this.userSessionRepository = userSessionRepository;
    this.roleAssignmentRepository = roleAssignmentRepository;
  }

  async execute({ email, password, deviceName, ipAddress, userAgent }) {
    const emailVoResult = Email.create(email);
    if (emailVoResult.isFailure) {
      return Result.fail(emailVoResult.error);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return Result.fail('Invalid email or password credentials');
    }

    const isValidPassword = await this.passwordHasher.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return Result.fail('Invalid email or password credentials');
    }

    const accessToken = this.tokenService.generateToken(
      {
        userId: user.id,
        email: user.email.value || user.email,
        name: user.name
      },
      { expiresIn: '15m' }
    );

    // Opaque, rotating refresh token — only its SHA-256 hash is persisted (see docs/auth_and_authorization.md).
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (this.userSessionRepository) {
      await this.userSessionRepository.create({
        id: crypto.randomUUID(),
        userId: user.id,
        refreshTokenHash,
        deviceName,
        ipAddress,
        userAgent,
        expiresAt
      });
    }

    const tenants = this.roleAssignmentRepository
      ? await this.roleAssignmentRepository.findTenantsWithRolesForUser(user.id)
      : [];

    return Result.ok({
      // `token` kept for backward compatibility with existing clients; new clients should use `accessToken`.
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email.value || user.email,
        name: user.name,
        status: user.status
      },
      tenants
    });
  }
}

module.exports = { LoginUserUseCase };
