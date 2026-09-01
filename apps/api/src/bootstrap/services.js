const { identityDomain, infraDatabase } = require('./domain-bridge');
const { RegisterUserUseCase, CreateTenantUseCase } = identityDomain.application;
const { DrizzleUserRepository, DrizzleTenantRepository, DrizzleOrganizationRepository } = infraDatabase;

function registerServices(container) {
  // Health Service
  container.register('HealthService', () => ({
    getHealth: () => ({ status: 'ok', timestamp: new Date() })
  }));

  // Database Connection Client Mock / Instance
  const mockDbClient = {}; // Drizzle DB instance or mock

  // Repositories
  container.register('UserRepository', () => new DrizzleUserRepository(mockDbClient));
  container.register('TenantRepository', () => new DrizzleTenantRepository(mockDbClient));
  container.register('OrganizationRepository', () => new DrizzleOrganizationRepository(mockDbClient));

  // Application Use Cases
  container.register(
    'RegisterUserUseCase',
    (c) =>
      new RegisterUserUseCase({
        userRepository: c.resolve('UserRepository'),
        passwordHasher: {
          hash: async (password) => `hashed_${password}`
        }
      })
  );

  container.register(
    'CreateTenantUseCase',
    (c) =>
      new CreateTenantUseCase({
        tenantRepository: c.resolve('TenantRepository'),
        userRepository: c.resolve('UserRepository'),
        organizationRepository: c.resolve('OrganizationRepository')
      })
  );
}

module.exports = { registerServices };
