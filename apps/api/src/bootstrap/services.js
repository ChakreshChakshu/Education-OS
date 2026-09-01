const { identityDomain, academicsDomain, learningDomain, infraDatabase } = require('./domain-bridge');

const { RegisterUserUseCase, CreateTenantUseCase } = identityDomain.application;
const { CreateCourseUseCase, CreateBatchUseCase } = academicsDomain.application;
const { MarkLessonCompleteUseCase, SubmitQuizUseCase } = learningDomain.application;

const {
  DrizzleUserRepository,
  DrizzleTenantRepository,
  DrizzleOrganizationRepository,
  DrizzleCourseRepository,
  DrizzleBatchRepository,
  DrizzleLessonModuleRepository,
  DrizzleStudentProgressRepository,
  DrizzleQuizSubmissionRepository
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

  // Learning Repositories
  container.register('LessonModuleRepository', () => new DrizzleLessonModuleRepository(mockDbClient));
  container.register('StudentProgressRepository', () => new DrizzleStudentProgressRepository(mockDbClient));
  container.register('QuizSubmissionRepository', () => new DrizzleQuizSubmissionRepository(mockDbClient));

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

  // Learning Use Cases
  container.register(
    'MarkLessonCompleteUseCase',
    (c) =>
      new MarkLessonCompleteUseCase({
        studentProgressRepository: c.resolve('StudentProgressRepository'),
        lessonModuleRepository: c.resolve('LessonModuleRepository')
      })
  );

  container.register(
    'SubmitQuizUseCase',
    (c) =>
      new SubmitQuizUseCase({
        quizSubmissionRepository: c.resolve('QuizSubmissionRepository'),
        lessonModuleRepository: c.resolve('LessonModuleRepository')
      })
  );
}

module.exports = { registerServices };
