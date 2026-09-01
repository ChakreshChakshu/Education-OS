const { Result } = require('../../core');
const { User } = require('../../domain/entities/User');
const { Email } = require('../../domain/value-objects/Email');

class RegisterUserUseCase {
  constructor({ userRepository, passwordHasher }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  async execute(dto) {
    const { email, password, name, phone, timezone, language } = dto;

    const emailVoResult = Email.create(email);
    if (emailVoResult.isFailure) {
      return Result.fail(emailVoResult.error);
    }
    const emailVo = emailVoResult.getValue();

    const existingUser = await this.userRepository.findByEmail(emailVo.value);
    if (existingUser) {
      return Result.fail('User with this email already exists.');
    }

    if (!password || password.length < 8) {
      return Result.fail('Password must be at least 8 characters long.');
    }

    const passwordHash = this.passwordHasher
      ? await this.passwordHasher.hash(password)
      : password; // fallback if plain hash provider used in unit test

    const userResult = User.create({
      email: emailVo,
      passwordHash,
      name,
      phone,
      timezone,
      language
    });

    if (userResult.isFailure) {
      return Result.fail(userResult.error);
    }

    const user = userResult.getValue();
    await this.userRepository.save(user);

    return Result.ok({
      id: user.id,
      email: user.email.value,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt
    });
  }
}

module.exports = { RegisterUserUseCase };
