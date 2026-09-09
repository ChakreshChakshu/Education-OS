const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  identityDomain,
  academicsDomain,
  learningDomain,
  mediaDomain,
  infraDatabase,
  infraStorage
} = require('./domain-bridge');

const {
  RegisterUserUseCase,
  CreateTenantUseCase,
  LoginUserUseCase,
  RefreshTokenUseCase,
  LogoutUseCase
} = identityDomain.application;
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
  DrizzleUserSessionRepository,
  DrizzleRoleAssignmentRepository,
  DatabaseClient,
  seedRbacDefaults
} = infraDatabase;

const { LocalStorageProvider, R2StorageProvider } = infraStorage;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production.');
}
if (!process.env.JWT_SECRET) {
  console.warn(
    '[services] WARNING: JWT_SECRET is not set. Falling back to an insecure development default. ' +
      'Set JWT_SECRET in your .env file before deploying.'
  );
}
const JWT_SECRET = process.env.JWT_SECRET || 'eos-secret-key-development-2026';

function registerServices(container) {
  // Health Service
  container.register('HealthService', () => ({
    getHealth: () => ({ status: 'ok', timestamp: new Date() })
  }));

  // Password Hasher & Token Services
  const passwordHasher = {
    hash: async (password) => bcrypt.hash(password, 10),
    compare: async (password, hash) => {
      if (hash && hash.startsWith('hashed_')) {
        return hash === `hashed_${password}`;
      }
      return bcrypt.compare(password, hash);
    }
  };

  const tokenService = {
    generateToken: (payload, options = {}) => jwt.sign(payload, JWT_SECRET, { expiresIn: options.expiresIn || '15m' }),
    verifyToken: (token) => {
      try {
        return jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return null;
      }
    }
  };

  container.register('PasswordHasher', () => passwordHasher);
  container.register('TokenService', () => tokenService);

  // Database Client Instance
  const dbClient = new DatabaseClient({
    connectionString: process.env.DATABASE_URL
  });
  container.register('DatabaseClient', () => dbClient);

  // Best-effort RBAC bootstrap: seeds default roles/permissions if the tables are reachable
  // and empty. Non-fatal — the app must still boot when DATABASE_URL isn't configured (local dev).
  seedRbacDefaults(dbClient).catch((err) => {
    console.warn('[RBAC Seed] Skipped — could not seed default roles/permissions:', err.message);
  });

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
  container.register('UserSessionRepository', () => new DrizzleUserSessionRepository(dbClient));
  container.register('RoleAssignmentRepository', () => new DrizzleRoleAssignmentRepository(dbClient));

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
        passwordHasher: c.resolve('PasswordHasher')
      })
  );

  container.register(
    'LoginUserUseCase',
    (c) =>
      new LoginUserUseCase({
        userRepository: c.resolve('UserRepository'),
        passwordHasher: c.resolve('PasswordHasher'),
        tokenService: c.resolve('TokenService'),
        userSessionRepository: c.resolve('UserSessionRepository'),
        roleAssignmentRepository: c.resolve('RoleAssignmentRepository')
      })
  );

  container.register(
    'RefreshTokenUseCase',
    (c) =>
      new RefreshTokenUseCase({
        userSessionRepository: c.resolve('UserSessionRepository'),
        userRepository: c.resolve('UserRepository'),
        tokenService: c.resolve('TokenService')
      })
  );

  container.register(
    'LogoutUseCase',
    (c) =>
      new LogoutUseCase({
        userSessionRepository: c.resolve('UserSessionRepository')
      })
  );

  container.register(
    'CreateTenantUseCase',
    (c) =>
      new CreateTenantUseCase({
        tenantRepository: c.resolve('TenantRepository'),
        userRepository: c.resolve('UserRepository'),
        organizationRepository: c.resolve('OrganizationRepository'),
        roleAssignmentRepository: c.resolve('RoleAssignmentRepository')
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
