const { Result } = require('../../core');

class UpdateUserProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId, name, phone, timezone, language, avatar }) {
    if (!userId) {
      return Result.fail('User ID is required.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return Result.fail('User not found.');
    }

    const updateResult = user.updateProfile({
      name,
      phone,
      timezone,
      language,
      avatar
    });

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    await this.userRepository.save(user);

    return Result.ok({
      id: user.id,
      email: typeof user.email === 'string' ? user.email : user.email.value,
      name: user.name,
      phone: user.phone,
      timezone: user.timezone,
      language: user.language,
      avatar: user.avatar,
      status: user.status,
      updatedAt: user.updatedAt
    });
  }
}

module.exports = { UpdateUserProfileUseCase };
