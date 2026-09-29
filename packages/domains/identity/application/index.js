const { RegisterUserUseCase } = require('./use-cases/RegisterUserUseCase');
const { CreateTenantUseCase } = require('./use-cases/CreateTenantUseCase');
const { LoginUserUseCase } = require('./use-cases/LoginUserUseCase');
const { RefreshTokenUseCase } = require('./use-cases/RefreshTokenUseCase');
const { LogoutUseCase } = require('./use-cases/LogoutUseCase');
const { UpdateUserProfileUseCase } = require('./use-cases/UpdateUserProfileUseCase');
const { ChangePasswordUseCase } = require('./use-cases/ChangePasswordUseCase');
const { UpdateTenantSettingsUseCase } = require('./use-cases/UpdateTenantSettingsUseCase');

module.exports = {
  RegisterUserUseCase,
  CreateTenantUseCase,
  LoginUserUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  UpdateUserProfileUseCase,
  ChangePasswordUseCase,
  UpdateTenantSettingsUseCase
};

