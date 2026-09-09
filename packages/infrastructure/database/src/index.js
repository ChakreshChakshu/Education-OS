const { DatabaseClient } = require('./client');
const schema = require('./schema');
const { runMigrations } = require('./migrations');
const {
  BaseRepository,
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
  DrizzleRoleAssignmentRepository
} = require('./repositories');
const { seedDatabase, seedRbacDefaults } = require('./seed');
const { executeTransaction } = require('./transactions');

class DatabaseProvider {
  constructor(config = {}) {
    this.client = new DatabaseClient(config);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.disconnect();
  }
}

module.exports = {
  DatabaseProvider,
  DatabaseClient,
  schema,
  runMigrations,
  BaseRepository,
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
  seedDatabase,
  seedRbacDefaults,
  executeTransaction
};
