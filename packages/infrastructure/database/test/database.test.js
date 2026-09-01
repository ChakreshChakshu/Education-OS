const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  schema,
  DrizzleUserRepository,
  DrizzleTenantRepository,
  DrizzleOrganizationRepository,
  DrizzleCourseRepository,
  DrizzleBatchRepository,
  DrizzleLessonModuleRepository,
  DrizzleStudentProgressRepository,
  DrizzleQuizSubmissionRepository,
  DrizzleMediaAssetRepository
} = require('../src');
const { User, Tenant, Organization, UserTenantMembership, OrganizationMembership } = require('../src/domain-identity-bridge');
const { Course, Batch } = require('../src/domain-academics-bridge');
const { LessonModule, StudentProgress, QuizSubmission } = require('../src/domain-learning-bridge');
const { MediaAsset } = require('../src/domain-media-bridge');

test('Database schema exports identity, academics, learning, and media tables', () => {
  assert.notEqual(schema.usersTable, undefined);
  assert.notEqual(schema.tenantsTable, undefined);
  assert.notEqual(schema.organizationsTable, undefined);
  assert.notEqual(schema.userTenantMembershipsTable, undefined);
  assert.notEqual(schema.organizationMembershipsTable, undefined);
  assert.notEqual(schema.coursesTable, undefined);
  assert.notEqual(schema.batchesTable, undefined);
  assert.notEqual(schema.subjectsTable, undefined);
  assert.notEqual(schema.lessonModulesTable, undefined);
  assert.notEqual(schema.studentProgressTable, undefined);
  assert.notEqual(schema.quizSubmissionsTable, undefined);
  assert.notEqual(schema.mediaAssetsTable, undefined);
});

test('DrizzleUserRepository converts Domain Entity <-> Persistence Row correctly', () => {
  const userId = crypto.randomUUID();
  const user = User.create(
    {
      email: 'john@skillyards.com',
      passwordHash: 'hashed_pw_123',
      name: 'John Doe',
      phone: '+1234567890',
      status: 'ACTIVE'
    },
    userId
  ).getValue();

  const persistenceRow = DrizzleUserRepository.toPersistence(user);
  assert.equal(persistenceRow.id, userId);
  assert.equal(persistenceRow.email, 'john@skillyards.com');
  assert.equal(persistenceRow.passwordHash, 'hashed_pw_123');
  assert.equal(persistenceRow.name, 'John Doe');
  assert.equal(persistenceRow.status, 'ACTIVE');

  const rehydratedDomain = DrizzleUserRepository.toDomain(persistenceRow);
  assert.notEqual(rehydratedDomain, null);
  assert.equal(rehydratedDomain.id, userId);
  assert.equal(rehydratedDomain.email.value, 'john@skillyards.com');
  assert.equal(rehydratedDomain.name, 'John Doe');
});

test('DrizzleTenantRepository converts Tenant & Membership correctly', () => {
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  const tenant = Tenant.create(
    {
      name: 'SkillYards Org',
      slug: 'skillyards-org',
      status: 'ACTIVE'
    },
    tenantId
  ).getValue();

  const tenantRow = DrizzleTenantRepository.toPersistence(tenant);
  assert.equal(tenantRow.slug, 'skillyards-org');

  const rehydratedTenant = DrizzleTenantRepository.toDomain(tenantRow);
  assert.equal(rehydratedTenant.slug.value, 'skillyards-org');

  const membership = UserTenantMembership.create({
    userId,
    tenantId,
    status: 'ACTIVE'
  }).getValue();

  const memRow = DrizzleTenantRepository.membershipToPersistence(membership);
  assert.equal(memRow.userId, userId);
  assert.equal(memRow.tenantId, tenantId);

  const rehydratedMem = DrizzleTenantRepository.membershipToDomain(memRow);
  assert.equal(rehydratedMem.userId, userId);
});

test('DrizzleOrganizationRepository converts Organization & OrgMembership correctly', () => {
  const tenantId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  const org = Organization.create(
    {
      tenantId,
      name: 'Delhi Branch',
      code: 'DEL'
    },
    orgId
  ).getValue();

  const orgRow = DrizzleOrganizationRepository.toPersistence(org);
  assert.equal(orgRow.name, 'Delhi Branch');
  assert.equal(orgRow.code, 'DEL');

  const rehydratedOrg = DrizzleOrganizationRepository.toDomain(orgRow);
  assert.equal(rehydratedOrg.name, 'Delhi Branch');

  const orgMem = OrganizationMembership.create({
    organizationId: orgId,
    userId,
    role: 'TENANT_OWNER'
  }).getValue();

  const orgMemRow = DrizzleOrganizationRepository.membershipToPersistence(orgMem);
  assert.equal(orgMemRow.role, 'TENANT_OWNER');

  const rehydratedOrgMem = DrizzleOrganizationRepository.membershipToDomain(orgMemRow);
  assert.equal(rehydratedOrgMem.role, 'TENANT_OWNER');
});

test('DrizzleCourseRepository converts Course Domain Entity <-> Row correctly', async () => {
  const tenantId = crypto.randomUUID();
  const courseId = crypto.randomUUID();

  const course = Course.create(
    {
      tenantId,
      title: 'Operating Systems',
      code: 'CS-401',
      credits: 4,
      status: 'PUBLISHED'
    },
    courseId
  ).getValue();

  const repo = new DrizzleCourseRepository();
  await repo.save(course);

  const found = await repo.findByCode(tenantId, 'CS-401');
  assert.notEqual(found, null);
  assert.equal(found.id, courseId);
  assert.equal(found.title, 'Operating Systems');
  assert.equal(found.code.value, 'CS-401');
});

test('DrizzleBatchRepository converts Batch Domain Entity <-> Row correctly', async () => {
  const courseId = crypto.randomUUID();
  const batchId = crypto.randomUUID();
  const instructorId = crypto.randomUUID();

  const batch = Batch.create(
    {
      courseId,
      name: '2026-Spring-Cohort-A',
      term: 'SPRING-2026',
      capacity: 40,
      instructorUserId: instructorId
    },
    batchId
  ).getValue();

  const repo = new DrizzleBatchRepository();
  await repo.save(batch);

  const foundList = await repo.findByCourseId(courseId);
  assert.equal(foundList.length, 1);
  assert.equal(foundList[0].id, batchId);
  assert.equal(foundList[0].name, '2026-Spring-Cohort-A');
  assert.equal(foundList[0].term.value, 'SPRING-2026');
  assert.equal(foundList[0].instructorUserId, instructorId);
});

test('DrizzleLessonModuleRepository converts LessonModule Domain <-> Row correctly', async () => {
  const courseId = crypto.randomUUID();
  const moduleId = crypto.randomUUID();

  const module = LessonModule.create(
    {
      courseId,
      title: 'Advanced System Architecture',
      contentType: 'VIDEO',
      contentUrl: 'https://video.skillyards.com/arch-1'
    },
    moduleId
  ).getValue();

  const repo = new DrizzleLessonModuleRepository();
  await repo.save(module);

  const found = await repo.findById(moduleId);
  assert.notEqual(found, null);
  assert.equal(found.title, 'Advanced System Architecture');
  assert.equal(found.contentType, 'VIDEO');
});

test('DrizzleStudentProgressRepository records student progress correctly', async () => {
  const studentUserId = crypto.randomUUID();
  const moduleId = crypto.randomUUID();

  const progress = StudentProgress.create({
    studentUserId,
    lessonModuleId: moduleId,
    status: 'COMPLETED'
  }).getValue();

  const repo = new DrizzleStudentProgressRepository();
  await repo.save(progress);

  const found = await repo.findByStudentAndModule(studentUserId, moduleId);
  assert.notEqual(found, null);
  assert.equal(found.studentUserId, studentUserId);
  assert.equal(found.lessonModuleId, moduleId);
});

test('DrizzleQuizSubmissionRepository converts QuizSubmission correctly', async () => {
  const submissionId = crypto.randomUUID();
  const studentUserId = crypto.randomUUID();
  const moduleId = crypto.randomUUID();

  const submission = QuizSubmission.create(
    {
      studentUserId,
      lessonModuleId: moduleId,
      score: 88,
      passingScore: 70
    },
    submissionId
  ).getValue();

  const repo = new DrizzleQuizSubmissionRepository();
  await repo.save(submission);

  const found = await repo.findById(submissionId);
  assert.notEqual(found, null);
  assert.equal(found.score.value, 88);
  assert.equal(found.passed, true);
});

test('DrizzleMediaAssetRepository converts MediaAsset Entity <-> Row correctly', async () => {
  const tenantId = crypto.randomUUID();
  const assetId = crypto.randomUUID();

  const asset = MediaAsset.create(
    {
      tenantId,
      filename: 'sample-video.mp4',
      mimeType: 'video/mp4',
      size: 1024 * 1024 * 25
    },
    assetId
  ).getValue();

  const repo = new DrizzleMediaAssetRepository();
  await repo.save(asset);

  const found = await repo.findById(assetId);
  assert.notEqual(found, null);
  assert.equal(found.filename, 'sample-video.mp4');
  assert.equal(found.mimeType.value, 'video/mp4');
  assert.equal(found.size.megaBytes, 25);
});
