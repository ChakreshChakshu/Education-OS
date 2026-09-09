const crypto = require('crypto');
const { Result } = require('../../core');

class RefreshTokenUseCase {
  constructor({ userSessionRepository, userRepository, tokenService }) {
    this.userSessionRepository = userSessionRepository;
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async execute({ refreshToken, deviceName, ipAddress, userAgent }) {
    if (!refreshToken) {
      return Result.fail('Refresh token is required.');
    }

    const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.userSessionRepository.findActiveByRefreshTokenHash(incomingHash);
    if (!session) {
      return Result.fail('Invalid or expired refresh token.');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      return Result.fail('User no longer exists.');
    }

    // Rotation: the presented refresh token is single-use — revoke it and issue a new pair.
    await this.userSessionRepository.revoke(session.id);

    const accessToken = this.tokenService.generateToken(
      { userId: user.id, email: user.email.value || user.email, name: user.name },
      { expiresIn: '15m' }
    );

    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.userSessionRepository.create({
      id: crypto.randomUUID(),
      userId: user.id,
      refreshTokenHash: newHash,
      deviceName: deviceName || session.deviceName,
      ipAddress: ipAddress || session.ipAddress,
      userAgent: userAgent || session.userAgent,
      expiresAt
    });

    return Result.ok({
      token: accessToken,
      accessToken,
      refreshToken: newRawRefreshToken
    });
  }
}

module.exports = { RefreshTokenUseCase };
