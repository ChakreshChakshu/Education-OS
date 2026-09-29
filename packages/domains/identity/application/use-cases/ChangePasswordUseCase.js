const { Result } = require('../../core');

class ChangePasswordUseCase {
  constructor({ userRepository, passwordHasher }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  async execute({ userId, currentPassword, newPassword }) {
    if (!userId) {
      return Result.fail('User ID is required.');
    }
    if (!currentPassword) {
      return Result.fail('Current password is required.');
    }
    if (!newPassword || newPassword.length < 8) {
      return Result.fail('New password must be at least 8 characters long.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return Result.fail('User not found.');
    }

    const isMatch = await this.passwordHasher.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return Result.fail('Current password is incorrect.');
    }

    const newHash = await this.passwordHasher.hash(newPassword);
    const updateResult = user.updatePassword(newHash);
    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    await this.userRepository.save(user);

    return Result.ok({
      id: user.id,
      updatedAt: user.updatedAt
    });
  }
}

module.exports = { ChangePasswordUseCase };
