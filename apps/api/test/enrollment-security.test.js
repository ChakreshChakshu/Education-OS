const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const Fastify = require('fastify');
const jwt = require('jsonwebtoken');
const publicRoutes = require('../src/routes/v1/public');
const internalRoutes = require('../src/routes/v1/internal');
const { learningDomain } = require('../src/bootstrap/domain-bridge');
const { EnrollStudentUseCase } = learningDomain.application;

test('storefront sends student activation by email and consumes the link exactly once', async (t) => {
  const tenant = { id: randomUUID(), name: 'Tenant', status: 'ACTIVE' };
  const course = { id: randomUUID(), tenantId: tenant.id, status: 'PUBLISHED', visibility: 'PUBLIC' };
  const existingUser = { id: randomUUID(), email: 'existing@example.test', status: 'ACTIVE', passwordHash: 'existing-hash' };
  const users = new Map([[existingUser.email, existingUser]]);
  const events = [];
  let sessions = 0;
  const secret = randomUUID();
  const tokenService = {
    generateToken: (payload, options) => jwt.sign(payload, secret, options),
    verifyToken: (token) => {
      try { return jwt.verify(token, secret); } catch { return null; }
    }
  };
  const userRepository = {
    findByEmail: async (email) => users.get(email),
    findById: async (id) => [...users.values()].find((user) => user.id === id),
    createStudentUser: async ({ email, name, passwordHash }) => {
      const user = { id: randomUUID(), email, name, passwordHash, status: 'ACTIVE' };
      users.set(email, user);
      return user;
    },
    consumeStudentActivation: async (id, email, expectedHash, nextHash) => {
      const user = [...users.values()].find((entry) => entry.id === id);
      if (!user || user.email !== email || user.passwordHash !== expectedHash) return false;
      user.passwordHash = nextHash;
      return true;
    }
  };
  const roles = {
    assignRole: async () => {},
    findTenantsWithRolesForUser: async () => [{ tenantId: tenant.id }],
    hasPermission: async () => true
  };
  const services = {
    TokenService: tokenService,
    TenantRepository: { findBySlug: async () => tenant, findById: async () => tenant },
    CourseRepository: { findById: async () => course },
    UserRepository: userRepository,
    RoleAssignmentRepository: roles,
    PasswordHasher: { hash: async () => 'new-hash' },
    UserSessionRepository: { create: async () => { sessions++; } },
    OutboxRepository: { create: async (event) => events.push(event) },
    EnrollStudentUseCase: new EnrollStudentUseCase({
      userRepository,
      roleAssignmentRepository: roles,
      tokenService,
      enrollmentRepository: { findByStudentAndCourse: async () => null, save: async (enrollment) => enrollment }
    })
  };
  const app = Fastify();
  t.after(() => app.close());
  await app.register(require('@fastify/cookie'));
  const container = { resolve: (name) => services[name] };
  await app.register(publicRoutes, { prefix: '/public', container });
  await app.register(internalRoutes, { prefix: '/internal', container });

  const existing = await app.inject({
    method: 'POST', url: '/public/storefront/tenant/enroll',
    payload: { courseId: course.id, email: existingUser.email }
  });
  assert.equal(existing.statusCode, 201);
  assert.equal(events[0].payload.activationUrl, null);
  assert.equal(existingUser.passwordHash, 'existing-hash');

  const registration = await app.inject({
    method: 'POST', url: '/public/storefront/tenant/enroll',
    payload: { courseId: course.id, email: 'new@example.test' }
  });
  assert.equal(registration.statusCode, 201);
  assert.equal(registration.json().enrollment.activationToken, undefined);
  assert.equal(registration.json().enrollment.temporaryPassword, undefined);
  const token = new URL(events[1].payload.activationUrl, 'https://example.test').searchParams.get('token');
  assert.ok(token);
  assert.equal(registration.body.includes(token), false);
  const existingAccess = tokenService.generateToken({ userId: existingUser.id }, { expiresIn: '5m' });
  const adminEnroll = await app.inject({
    method: 'POST', url: '/internal/academics/enrollments',
    headers: { authorization: `Bearer ${existingAccess}` },
    payload: { courseId: course.id, studentEmail: 'admin-invited@example.test' }
  });
  assert.equal(adminEnroll.statusCode, 201);
  assert.equal(adminEnroll.json().data.activationToken, undefined);
  assert.ok(events[2].payload.activationUrl);

  const verify = () => app.inject(`/public/auth/verify-activation-token?token=${token}`);
  assert.equal((await verify()).statusCode, 200);
  const activate = (value) => app.inject({
    method: 'POST', url: '/public/auth/activate', payload: { token: value, password: 'ExamplePassword123' }
  });
  const legacy = tokenService.generateToken({ userId: existingUser.id, type: 'student_activation' }, { expiresIn: '5m' });
  assert.equal((await activate(legacy)).statusCode, 400);
  assert.equal((await app.inject({
    url: '/internal/me', headers: { authorization: `Bearer ${token}` }
  })).statusCode, 401);
  const responses = await Promise.all([activate(token), activate(token)]);
  assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 400]);
  assert.equal(sessions, 1);
  assert.equal((await verify()).statusCode, 400);
});

test('learning routes check permission and active enrollment and use the enrolled batch', async (t) => {
  const userId = randomUUID();
  const tenantId = randomUUID();
  const courseId = randomUUID();
  const lessonId = randomUUID();
  const batchId = randomUUID();
  const operations = [];
  let status = 'DROPPED';
  const services = {
    TokenService: { verifyToken: () => ({ userId }) },
    RoleAssignmentRepository: {
      findTenantsWithRolesForUser: async () => [{ tenantId, role: 'STUDENT' }],
      hasPermission: async ({ permissionKey }) => ['lesson.read', 'assessment.submit'].includes(permissionKey)
    },
    CourseRepository: { findById: async () => ({ id: courseId, tenantId }) },
    LessonModuleRepository: {
      findById: async () => ({ courseId }),
      findByCourseId: async () => [{ id: lessonId }]
    },
    EnrollmentRepository: { findByStudentAndCourse: async () => ({ tenantId, status, batchId }) },
    MarkLessonCompleteUseCase: { execute: async (input) => {
      operations.push(input);
      return { isFailure: false, getValue: () => input };
    } }
  };
  const app = Fastify();
  t.after(() => app.close());
  await app.register(internalRoutes, { container: { resolve: (name) => services[name] } });

  const complete = (tenant) => app.inject({
    method: 'POST', url: '/learning/lessons/complete',
    headers: { authorization: 'Bearer session', 'x-tenant-id': tenant },
    payload: { lessonModuleId: lessonId, studentUserId: randomUUID(), batchId: randomUUID() }
  });
  assert.equal((await complete(tenantId)).statusCode, 403);
  assert.equal(operations.length, 0);
  const modules = () => app.inject({
    url: `/academics/courses/${courseId}/modules`,
    headers: { authorization: 'Bearer session' }
  });
  assert.equal((await modules()).statusCode, 403);

  status = 'ACTIVE';
  assert.equal((await complete(randomUUID())).statusCode, 403);
  assert.equal((await complete(tenantId)).statusCode, 200);
  assert.deepEqual(operations, [{ studentUserId: userId, lessonModuleId: lessonId, batchId }]);
  assert.equal((await modules()).statusCode, 200);
});

test('quiz API hides keys from students and completes only a server-graded passing attempt', async (t) => {
  const { MarkLessonCompleteUseCase, SubmitQuizUseCase } = learningDomain.application;
  const { LessonModule } = learningDomain.domain;
  const userId = randomUUID();
  const tenantId = randomUUID();
  const courseId = randomUUID();
  const lesson = LessonModule.create({
    courseId, title: 'Stored Quiz', contentType: 'QUIZ',
    quiz: {
      question: 'Pick the best option.',
      options: [{ key: 'A', text: 'First' }, { key: 'B', text: 'Second' }],
      correct: 'B',
      explanation: 'Staff-only explanation',
      passingScore: 90
    }
  }).getValue();
  const course = { id: courseId, tenantId };
  const submissions = [];
  const progress = [];
  const lessonModuleRepository = {
    findById: async (id) => id === lesson.id ? lesson : null,
    findByCourseId: async () => [lesson]
  };
  const markLessonCompleteUseCase = new MarkLessonCompleteUseCase({
    lessonModuleRepository,
    studentProgressRepository: {
      findByStudentAndModule: async () => progress[0],
      save: async (entry) => progress.push(entry)
    }
  });
  const services = {
    TokenService: { verifyToken: () => ({ userId }) },
    RoleAssignmentRepository: {
      findTenantsWithRolesForUser: async () => [{ tenantId }],
      hasPermission: async ({ permissionKey }) => permissionKey !== 'lesson.publish'
    },
    CourseRepository: { findById: async () => course },
    LessonModuleRepository: lessonModuleRepository,
    EnrollmentRepository: { findByStudentAndCourse: async () => ({ tenantId, status: 'ACTIVE' }) },
    MarkLessonCompleteUseCase: markLessonCompleteUseCase,
    SubmitQuizUseCase: new SubmitQuizUseCase({
      lessonModuleRepository, markLessonCompleteUseCase,
      quizSubmissionRepository: { save: async (submission) => submissions.push(submission) }
    })
  };
  const app = Fastify();
  t.after(() => app.close());
  await app.register(internalRoutes, { container: { resolve: (name) => services[name] } });
  const headers = { authorization: 'Bearer student', 'x-tenant-id': tenantId };

  const modules = () => app.inject({ url: `/academics/courses/${courseId}/modules`, headers });
  const studentModules = await modules();
  assert.equal(studentModules.statusCode, 200);
  const quiz = studentModules.json().data[0].quiz;
  assert.equal(quiz.questions[0].id, 'q_legacy_1');
  assert.deepEqual(quiz.questions[0].options[1], { id: 'B', key: 'B', label: 'Second' });
  assert.doesNotMatch(JSON.stringify(quiz), /"correct"|"isCorrect"|"explanation"/);

  t.mock.method(services.RoleAssignmentRepository, 'hasPermission', async () => true);
  assert.equal((await modules()).json().data[0].quiz.correct, 'B');
  t.mock.restoreAll();

  const submit = (payload) => app.inject({
    method: 'POST', url: '/learning/quizzes/submit', headers,
    payload: { lessonModuleId: lesson.id, ...payload }
  });
  assert.equal((await submit({ score: 100 })).statusCode, 400);
  assert.equal((await app.inject({
    method: 'POST', url: '/learning/lessons/complete', headers,
    payload: { lessonModuleId: lesson.id }
  })).statusCode, 400);
  const wrong = await submit({ answers: { q_legacy_1: ['A'] }, score: 100, passingScore: 0 });
  assert.equal(wrong.statusCode, 201);
  assert.equal(wrong.json().data.passed, false);
  assert.equal(progress.length, 0);
  const correct = await submit({ answers: { q_legacy_1: ['B'] } });
  assert.equal(correct.statusCode, 201);
  assert.equal(correct.json().data.score, 100);
  assert.equal(correct.json().data.passed, true);
  assert.equal(submissions.length, 2);
  assert.equal(progress.length, 1);
});
