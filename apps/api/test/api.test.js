const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { container } = require('../src/bootstrap/container');
const { registerProviders } = require('../src/bootstrap/providers');
const { registerServices } = require('../src/bootstrap/services');
const internalV1Routes = require('../src/routes/v1/internal');
const publicV1Routes = require('../src/routes/v1/public');

async function buildApp() {
  const app = Fastify();
  await app.register(require('@fastify/cookie'));
  process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
  registerProviders(container);
  registerServices(container);

  await app.register(internalV1Routes, { prefix: '/api/v1/internal', container });
  await app.register(publicV1Routes, { prefix: '/api/v1/public', container });

  return app;
}

test('POST /api/v1/public/auth/register creates a user successfully', async () => {
  const app = await buildApp();
  const uniqueEmail = `alice_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@skillyards.com`;

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/register',
    payload: {
      email: uniqueEmail,
      password: 'SecurePassword123',
      name: 'Alice Johnson'
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.name, 'Alice Johnson');
  assert.equal(body.data.email, uniqueEmail);
  assert.notEqual(body.data.id, undefined);
});

test('POST /api/v1/public/auth/register rejects invalid email format', async () => {
  const app = await buildApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/register',
    payload: {
      email: 'invalid-email',
      password: 'SecurePassword123',
      name: 'Alice'
    }
  });

  assert.equal(response.statusCode, 400);
});

test('POST /api/v1/internal/tenants provisions tenant and organization', async () => {
  const app = await buildApp();
  const ownerUserId = crypto.randomUUID();
  const uniqueEmail = `owner_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@institution.com`;
  const uniqueSlug = `metro-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  // Resolve user repository from container after app initialization
  const userRepo = container.resolve('UserRepository');
  const { User } = require('../src/bootstrap/domain-bridge').identityDomain.domain;
  const user = User.create(
    {
      email: uniqueEmail,
      passwordHash: 'hashed_pw',
      name: 'Owner User'
    },
    ownerUserId
  ).getValue();
  await userRepo.save(user);

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/tenants',
    payload: {
      name: 'Metropolitan Academy',
      slug: uniqueSlug,
      ownerUserId: ownerUserId
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.tenant.name, 'Metropolitan Academy');
  assert.equal(body.data.tenant.slug, uniqueSlug);
  assert.equal(body.data.organization.name, 'Main Branch');
  assert.equal(body.data.membership.role, 'TENANT_OWNER');
});

async function getOrCreateTestTenant(app) {
  const ownerUserId = crypto.randomUUID();
  const userRepo = container.resolve('UserRepository');
  const { User } = require('../src/bootstrap/domain-bridge').identityDomain.domain;
  const user = User.create(
    {
      email: `test_owner_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@inst.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Owner'
    },
    ownerUserId
  ).getValue();
  await userRepo.save(user);

  const tRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/tenants',
    payload: {
      name: 'Test Academy',
      slug: `test-acad-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      ownerUserId
    }
  });
  return JSON.parse(tRes.payload).data.tenant.id;
}

test('POST /api/v1/internal/academics/courses creates a course', async () => {
  const app = await buildApp();
  const tenantId = await getOrCreateTestTenant(app);

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId },
    payload: {
      tenantId: tenantId,
      title: 'Database Management Systems',
      code: 'CS-302',
      description: 'Relational & NoSQL Systems',
      credits: 4
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.title, 'Database Management Systems');
  assert.equal(body.data.code, 'CS-302');
  assert.equal(body.data.credits, 4);

  // Verify GET /courses retrieves created course
  const listRes = await app.inject({
    method: 'GET',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId }
  });
  assert.equal(listRes.statusCode, 200);
  const listBody = JSON.parse(listRes.payload);
  assert.equal(listBody.success, true);
  assert.equal(listBody.data.length, 1);
  assert.equal(listBody.data[0].code, 'CS-302');
});


test('POST /api/v1/internal/academics/batches provisions a cohort batch', async () => {
  const app = await buildApp();
  const tenantId = await getOrCreateTestTenant(app);

  // Create course first via endpoint
  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId },
    payload: {
      tenantId: tenantId,
      title: 'Software Engineering',
      code: 'CS-405'
    }
  });
  const courseData = JSON.parse(courseRes.payload).data;

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/batches',
    payload: {
      courseId: courseData.id,
      name: '2026-Fall-Batch-1',
      term: 'FALL-2026',
      capacity: 50
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.name, '2026-Fall-Batch-1');
  assert.equal(body.data.term, 'FALL-2026');
});

test('POST /api/v1/internal/learning/lessons/complete records lesson completion', async () => {
  const app = await buildApp();
  const tenantId = await getOrCreateTestTenant(app);
  const studentUserId = crypto.randomUUID();
  const userRepo = container.resolve('UserRepository');
  const { User } = require('../src/bootstrap/domain-bridge').identityDomain.domain;
  const student = User.create(
    {
      email: `student_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@test.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Student'
    },
    studentUserId
  ).getValue();
  await userRepo.save(student);

  // Create prerequisite course to satisfy FK
  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId },
    payload: {
      tenantId: tenantId,
      title: 'Cloud Computing Architecture',
      code: 'CS-501'
    }
  });
  const courseId = JSON.parse(courseRes.payload).data.id;

  const moduleRepo = container.resolve('LessonModuleRepository');
  const { LessonModule } = require('../src/bootstrap/domain-bridge').learningDomain.domain;
  const module = LessonModule.create({
    courseId,
    title: 'Cloud Native Computing'
  }).getValue();
  await moduleRepo.save(module);

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/learning/lessons/complete',
    payload: {
      studentUserId: studentUserId,
      lessonModuleId: module.id
    }
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.alreadyCompleted, false);
});

test('POST /api/v1/internal/learning/quizzes/submit processes quiz submission', async () => {
  const app = await buildApp();
  const tenantId = await getOrCreateTestTenant(app);
  const studentUserId = crypto.randomUUID();

  // Create prerequisite course to satisfy FK
  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId },
    payload: {
      tenantId: tenantId,
      title: 'Distributed Systems Course',
      code: 'CS-601'
    }
  });
  const courseId = JSON.parse(courseRes.payload).data.id;

  const moduleRepo = container.resolve('LessonModuleRepository');
  const { LessonModule } = require('../src/bootstrap/domain-bridge').learningDomain.domain;
  const module = LessonModule.create({
    courseId,
    title: 'Distributed Systems Quiz'
  }).getValue();
  await moduleRepo.save(module);

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/learning/quizzes/submit',
    payload: {
      studentUserId: studentUserId,
      lessonModuleId: module.id,
      score: 91,
      passingScore: 75
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.passed, true);
  assert.equal(body.data.score, 91);
});

test('POST /api/v1/internal/media/presign creates presigned upload URL', async () => {
  const app = await buildApp();
  const tenantId = crypto.randomUUID();

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/media/presign',
    payload: {
      tenantId,
      filename: 'lecture-architecture.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024 * 1024 * 80
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.filename, 'lecture-architecture.mp4');
  assert.equal(body.data.status, 'PENDING_UPLOAD');
  assert.notEqual(body.data.uploadUrl, undefined);
});

test('POST /api/v1/internal/media/confirm confirms file upload completion', async () => {
  const app = await buildApp();
  const tenantId = crypto.randomUUID();

  // Create presigned asset first
  const presignRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/media/presign',
    payload: {
      tenantId,
      filename: 'lecture-intro.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024 * 1024 * 50
    }
  });
  const assetData = JSON.parse(presignRes.payload).data;

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/media/confirm',
    payload: {
      mediaAssetId: assetData.id
    }
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ENCODING');
});

test('Lesson modules support CRUD: create, update, list, and delete', async () => {
  const app = await buildApp();
  const tenantId = await getOrCreateTestTenant(app);

  // 1. Create course
  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId },
    payload: {
      tenantId,
      title: 'Distributed Systems',
      code: 'CS-601'
    }
  });
  const courseId = JSON.parse(courseRes.payload).data.id;

  // 2. Create module
  const createModRes = await app.inject({
    method: 'POST',
    url: `/api/v1/internal/academics/courses/${courseId}/modules`,
    payload: {
      title: 'Consensus Protocols',
      contentType: 'VIDEO',
      contentUrl: 'https://r2.cdn/consensus.mp4',
      order: 1
    }
  });
  assert.equal(createModRes.statusCode, 201);
  const createdMod = JSON.parse(createModRes.payload).data;
  assert.equal(createdMod.title, 'Consensus Protocols');

  // 3. Update module
  const updateModRes = await app.inject({
    method: 'PUT',
    url: `/api/v1/internal/academics/courses/${courseId}/modules/${createdMod.id}`,
    payload: {
      title: 'Raft & Paxos Consensus Protocols',
      contentType: 'VIDEO'
    }
  });
  assert.equal(updateModRes.statusCode, 200);
  const updatedMod = JSON.parse(updateModRes.payload).data;
  assert.equal(updatedMod.title, 'Raft & Paxos Consensus Protocols');

  // 4. Verify listed
  const listRes = await app.inject({
    method: 'GET',
    url: `/api/v1/internal/academics/courses/${courseId}/modules`
  });
  assert.equal(listRes.statusCode, 200);
  const listData = JSON.parse(listRes.payload).data;
  assert.equal(listData.length, 1);
  assert.equal(listData[0].id, createdMod.id);

  // 5. Delete module
  const deleteRes = await app.inject({
    method: 'DELETE',
    url: `/api/v1/internal/academics/courses/${courseId}/modules/${createdMod.id}`
  });
  assert.equal(deleteRes.statusCode, 200);

  // 6. Verify no longer listed
  const listAfterDel = await app.inject({
    method: 'GET',
    url: `/api/v1/internal/academics/courses/${courseId}/modules`
  });
  assert.equal(listAfterDel.statusCode, 200);
  const listAfterDelData = JSON.parse(listAfterDel.payload).data;
  assert.equal(listAfterDelData.some(m => m.id === createdMod.id), false);
});

test('Student progress tracking: complete lesson and query course progress', async () => {
  const app = await buildApp();
  const tenantId = await getOrCreateTestTenant(app);
  const userRepo = container.resolve('UserRepository');
  const moduleRepo = container.resolve('LessonModuleRepository');
  const { User } = require('../src/bootstrap/domain-bridge').identityDomain.domain;

  // Create prerequisite course to satisfy FK
  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/academics/courses',
    headers: { 'x-tenant-id': tenantId },
    payload: {
      tenantId,
      title: 'Progress Tracking 101',
      code: `PRG-${Date.now().toString().slice(-4)}`
    }
  });
  const courseId = JSON.parse(courseRes.payload).data.id;

  const module1 = {
    id: crypto.randomUUID(),
    courseId,
    title: 'Lesson 1: Outbox Fundamentals',
    contentType: 'VIDEO',
    order: 1,
    status: 'PUBLISHED',
    props: { createdAt: new Date() }
  };
  const module2 = {
    id: crypto.randomUUID(),
    courseId,
    title: 'Lesson 2: Dequeuing Workers',
    contentType: 'DOCUMENT',
    order: 2,
    status: 'PUBLISHED',
    props: { createdAt: new Date() }
  };
  await moduleRepo.save(module1);
  await moduleRepo.save(module2);

  const testStudentId = crypto.randomUUID();
  const studentProgressUser = User.create(
    {
      email: `student_prog_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@test.com`,
      passwordHash: 'hashed_pw',
      name: 'Progress Student'
    },
    testStudentId
  ).getValue();
  await userRepo.save(studentProgressUser);

  // 1. Initially 0% progress
  const initialProgRes = await app.inject({
    method: 'GET',
    url: `/api/v1/internal/learning/courses/${courseId}/progress?studentUserId=${testStudentId}`
  });
  assert.equal(initialProgRes.statusCode, 200);
  const initialProg = JSON.parse(initialProgRes.payload).data;
  assert.equal(initialProg.progressPercent, 0);
  assert.equal(initialProg.completedLessonIds.length, 0);
  assert.equal(initialProg.totalModules, 2);

  // 2. Complete Lesson 1
  const completeRes = await app.inject({
    method: 'POST',
    url: '/api/v1/internal/learning/lessons/complete',
    payload: {
      studentUserId: testStudentId,
      lessonModuleId: module1.id
    }
  });
  assert.equal(completeRes.statusCode, 200);

  // 3. Query progress -> 50%
  const updatedProgRes = await app.inject({
    method: 'GET',
    url: `/api/v1/internal/learning/courses/${courseId}/progress?studentUserId=${testStudentId}`
  });
  assert.equal(updatedProgRes.statusCode, 200);
  const updatedProg = JSON.parse(updatedProgRes.payload).data;
  assert.equal(updatedProg.progressPercent, 50);
  assert.equal(updatedProg.completedCount, 1);
  assert.equal(updatedProg.completedLessonIds.includes(module1.id), true);
});


