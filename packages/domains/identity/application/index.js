const { RegisterUserUseCase } = require('./use-cases/RegisterUserUseCase');
const { CreateTenantUseCase } = require('./use-cases/CreateTenantUseCase');
const { LoginUserUseCase } = require('./use-cases/LoginUserUseCase');

module.exports = {
  RegisterUserUseCase,
  CreateTenantUseCase,
  LoginUserUseCase
};
