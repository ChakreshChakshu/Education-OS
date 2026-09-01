const {
  identityDomain,
  academicsDomain,
  learningDomain,
  mediaDomain,
  infraDatabase,
  infraStorage
} = require('./domain-bridge');

const { RegisterUserUseCase, CreateTenantUseCase } = identityDomain.application;
const { CreateCourseUseCase, CreateBatchUseCase } = academicsDomain.application;
const { MarkLessonCompleteUseCase, SubmitQuizUseCase } = learningDomain.application;
const { CreatePresignedUploadUrlUseCase, ConfirmMediaUploadUseCase } = mediaDomain.application;

const {
  DrizzleUserRepository,
  DrizzleTenantRepository,
  DrizzleOrganizationRepository,
  DrizzleCourseRepository,
  DrizzleBatchRepository,
  DrizzleLessonModuleRepository,
  DrizzleStudentProgressRepository,
  DrizzleQuizSubmissionRepository,
  DrizzleMediaAssetRepository,
  DatabaseClient
} = infraDatabase;

const { LocalStorageProvider, R2StorageProvider } = infraStorage;

function registerServices(container) {
  // Health Service
  container.register('HealthService', () => ({
    getHealth: () => ({ status: 'ok', timestamp: new Date() })
  }));

  // Database Client Instance
  const dbClient = new DatabaseClient({
    connectionString: process.env.DATABASE_URL
  });
  container.register('DatabaseClient', () => dbClient);

  // Storage Provider: Auto-switch between Cloudflare R2 & Local Disk
  container.register('StorageProvider', () => {
    if (process.env.R2_BUCKET_NAME || process.env.R2_ACCOUNT_ID) {
      return new R2StorageProvider({
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicDomain: process.env.R2_PUBLIC_DOMAIN
      });
    }
    return new LocalStorageProvider({ uploadDir: './uploads' });
  });

  // Identity Repositories
  container.register('UserRepository', () => new DrizzleUserRepository(dbClient));
  container.register('TenantRepository', () => new DrizzleTenantRepository(dbClient));
  container.register('OrganizationRepository', () => new DrizzleOrganizationRepository(dbClient));

  // Academics Repositories
  container.register('CourseRepository', () => new DrizzleCourseRepository(dbClient));
  container.register('BatchRepository', () => new DrizzleBatchRepository(dbClient));

  // Learning Repositories
  container.register('LessonModuleRepository', () => new DrizzleLessonModuleRepository(dbClient));
  container.register('StudentProgressRepository', () => new DrizzleStudentProgressRepository(dbClient));
  container.register('QuizSubmissionRepository', () => new DrizzleQuizSubmissionRepository(dbClient));

  // Media Repositories
  container.register('MediaAssetRepository', () => new DrizzleMediaAssetRepository(dbClient));

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

  // Media Use Cases
  container.register(
    'CreatePresignedUploadUrlUseCase',
    (c) =>
      new CreatePresignedUploadUrlUseCase({
        mediaAssetRepository: c.resolve('MediaAssetRepository'),
        storageProvider: c.resolve('StorageProvider')
      })
  );

  container.register(
    'ConfirmMediaUploadUseCase',
    (c) =>
      new ConfirmMediaUploadUseCase({
        mediaAssetRepository: c.resolve('MediaAssetRepository')
      })
  );
}

module.exports = { registerServices };
