const { identityDomain, academicsDomain, infraDatabase } = require('./domain-bridge');

const { RegisterUserUseCase, CreateTenantUseCase } = identityDomain.application;
const { CreateCourseUseCase, CreateBatchUseCase } = academicsDomain.application;

const {
  DrizzleUserRepository,
  DrizzleTenantRepository,
  DrizzleOrganizationRepository,
  DrizzleCourseRepository,
  DrizzleBatchRepository
} = infraDatabase;

function registerServices(container) {
  // Health Service
  container.register('HealthService', () => ({
    getHealth: () => ({ status: 'ok', timestamp: new Date() })
  }));

  // Database Connection Client Mock / Instance
  const mockDbClient = {};

  // Identity Repositories
  container.register('UserRepository', () => new DrizzleUserRepository(mockDbClient));
  container.register('TenantRepository', () => new DrizzleTenantRepository(mockDbClient));
  container.register('OrganizationRepository', () => new DrizzleOrganizationRepository(mockDbClient));

  // Academics Repositories
  container.register('CourseRepository', () => new DrizzleCourseRepository(mockDbClient));
  container.register('BatchRepository', () => new DrizzleBatchRepository(mockDbClient));

  // Identity Use Cases
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

  // Academics Use Cases
  container.register(
    'CreateCourseUseCase',
    (c) =>
      new CreateCourseUseCase({
        courseRepository: c.resolve('CourseRepository')
      })
  );

  container.register(
    'CreateBatchUseCase',
    (c) =>
      new CreateBatchUseCase({
        batchRepository: c.resolve('BatchRepository'),
        courseRepository: c.resolve('CourseRepository')
      })
  );
}

module.exports = { registerServices };
