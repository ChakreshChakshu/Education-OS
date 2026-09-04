const { Result } = require('../../core');
const { Email } = require('../../domain/value-objects/Email');

class LoginUserUseCase {
  constructor({ userRepository, passwordHasher, tokenService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async execute({ email, password }) {
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

    const token = this.tokenService.generateToken({
      userId: user.id,
      email: user.email.value || user.email,
      name: user.name
    });

    return Result.ok({
      token,
      user: {
        id: user.id,
        email: user.email.value || user.email,
        name: user.name,
        status: user.status
      }
    });
  }
}

module.exports = { LoginUserUseCase };
