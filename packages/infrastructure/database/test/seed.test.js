const test = require('node:test');
const assert = require('node:assert/strict');

const {
  seedDatabase,
  DrizzleUserRepository,
  DrizzleTenantRepository,
  DrizzleOrganizationRepository,
  DrizzleCourseRepository,
  DrizzleBatchRepository,
  DrizzleLessonModuleRepository,
  DrizzleStudentProgressRepository,
  DrizzleQuizSubmissionRepository
} = require('../src');

test('seedDatabase populates multi-tenant data across all 3 bounded contexts', async () => {
  const repos = {
    userRepository: new DrizzleUserRepository(),
    tenantRepository: new DrizzleTenantRepository(),
    organizationRepository: new DrizzleOrganizationRepository(),
    courseRepository: new DrizzleCourseRepository(),
    batchRepository: new DrizzleBatchRepository(),
    lessonModuleRepository: new DrizzleLessonModuleRepository(),
    studentProgressRepository: new DrizzleStudentProgressRepository(),
    quizSubmissionRepository: new DrizzleQuizSubmissionRepository()
  };

  const seedResult = await seedDatabase(repos);

  assert.equal(seedResult.users.length, 3);
  assert.equal(seedResult.tenants.length, 1);
  assert.equal(seedResult.organizations.length, 1);
  assert.equal(seedResult.courses.length, 1);
  assert.equal(seedResult.batches.length, 1);
  assert.equal(seedResult.modules.length, 2);
  assert.equal(seedResult.progresses.length, 1);
  assert.equal(seedResult.submissions.length, 1);

  // Verify rehydration from repositories
  const adminUser = await repos.userRepository.findByEmail('admin@skillyards.com');
  assert.notEqual(adminUser, null);
  assert.equal(adminUser.name, 'System Admin');

  const course = await repos.courseRepository.findByCode(seedResult.tenants[0].id, 'CS-101');
  assert.notEqual(course, null);
  assert.equal(course.title, 'Introduction to Computer Science');

  const modules = await repos.lessonModuleRepository.findByCourseId(course.id);
  assert.equal(modules.length, 2);

  const student = seedResult.users.find((u) => u.email.value === 'student.alex@metropolitan.edu');
  const progress = await repos.studentProgressRepository.findByStudentAndModule(
    student.id,
    modules[0].id
  );
  assert.notEqual(progress, null);
  assert.equal(progress.status, 'COMPLETED');
});
