const crypto = require('crypto');
const { Result } = require('../../core');

class LogoutUseCase {
  constructor({ userSessionRepository }) {
    this.userSessionRepository = userSessionRepository;
  }

  async execute({ refreshToken }) {
    if (!refreshToken) {
      return Result.fail('Refresh token is required.');
    }

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.userSessionRepository.revokeByRefreshTokenHash(hash);

    return Result.ok({ loggedOut: true });
  }
}

module.exports = { LogoutUseCase };
