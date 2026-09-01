const { BaseRepository } = require('./BaseRepository');
const { DrizzleUserRepository } = require('./DrizzleUserRepository');
const { DrizzleTenantRepository } = require('./DrizzleTenantRepository');
const { DrizzleOrganizationRepository } = require('./DrizzleOrganizationRepository');
const { DrizzleCourseRepository } = require('./DrizzleCourseRepository');
const { DrizzleBatchRepository } = require('./DrizzleBatchRepository');
const { DrizzleLessonModuleRepository } = require('./DrizzleLessonModuleRepository');
const { DrizzleStudentProgressRepository } = require('./DrizzleStudentProgressRepository');
const { DrizzleQuizSubmissionRepository } = require('./DrizzleQuizSubmissionRepository');

module.exports = {
  BaseRepository,
  DrizzleUserRepository,
  DrizzleTenantRepository,
  DrizzleOrganizationRepository,
  DrizzleCourseRepository,
  DrizzleBatchRepository,
  DrizzleLessonModuleRepository,
  DrizzleStudentProgressRepository,
  DrizzleQuizSubmissionRepository
};
