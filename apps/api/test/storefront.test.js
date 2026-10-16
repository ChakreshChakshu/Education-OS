const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { container } = require('../src/bootstrap/container');
const { registerProviders } = require('../src/bootstrap/providers');
const { registerServices } = require('../src/bootstrap/services');
const publicV1Routes = require('../src/routes/v1/public');

async function buildApp() {
  const app = Fastify();
  await app.register(require('@fastify/cookie'));
  process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
  registerProviders(container);
  registerServices(container);

  await app.register(publicV1Routes, { prefix: '/api/v1/public', container });
  return app;
}

test('Tenant Public Storefront API Flow', async (t) => {
  const app = await buildApp();
  const tenantRepo = container.resolve('TenantRepository');
  const courseRepo = container.resolve('CourseRepository');
  const moduleRepo = container.resolve('LessonModuleRepository');

  const { Tenant, TenantSlug } = require('../src/bootstrap/domain-bridge').identityDomain.domain;
  const { Course, CourseCode } = require('../src/bootstrap/domain-bridge').academicsDomain.domain;
  const { LessonModule } = require('../src/bootstrap/domain-bridge').learningDomain.domain;

  const testSlugStr = `storefront-test-${Date.now()}`;
  const slugVo = TenantSlug.create(testSlugStr).getValue();
  const tenant = Tenant.create({
    name: 'Apollo Technical Academy',
    slug: slugVo,
    status: 'ACTIVE',
    settingsJson: {
      tagline: 'Leading the frontier of space engineering',
      primaryColor: '#0ea5e9'
    }
  }).getValue();
  await tenantRepo.save(tenant);

  // 1. Test GET /storefront/:slug
  await t.test('GET /storefront/:slug returns tenant profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/public/storefront/${testSlugStr}`
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.tenant.name, 'Apollo Technical Academy');
    assert.equal(body.tenant.branding.tagline, 'Leading the frontier of space engineering');
  });

  // 2. Create courses for tenant and test GET /storefront/:slug/courses
  const courseCode = CourseCode.create(`APOLLO-${Math.floor(100 + Math.random() * 900)}`).getValue();
  const course = Course.create({
    tenantId: tenant.id,
    title: 'Orbital Mechanics 101',
    code: courseCode,
    shortDescription: 'Foundations of orbital trajectories and rocket propulsion.',
    level: 'BEGINNER',
    visibility: 'PUBLIC'
  }).getValue();
  await courseRepo.save(course);

  // Create preview lesson module
  const lessonModule = LessonModule.create({
    courseId: course.id,
    title: 'Introduction to Keplerian Orbits',
    contentType: 'VIDEO',
    contentUrl: 'https://cdn.educationos.dev/demo/kepler.m3u8',
    order: 1,
    status: 'PUBLISHED'
  }).getValue();
  await moduleRepo.save(lessonModule);

  await t.test('GET /storefront/:slug/courses lists public courses', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/public/storefront/${testSlugStr}/courses`
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.courses.length >= 1);
    const found = body.courses.find((c) => c.id === course.id);
    assert.ok(found);
    assert.equal(found.title, 'Orbital Mechanics 101');
  });

  // 3. Test GET /storefront/:slug/courses/:courseId
  await t.test('GET /storefront/:slug/courses/:courseId returns curriculum & preview module', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/public/storefront/${testSlugStr}/courses/${course.id}`
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.course.title, 'Orbital Mechanics 101');
    assert.ok(body.course.modules.length >= 1);
    assert.equal(body.course.modules[0].isPreview, true);
    assert.equal(body.course.modules[0].contentUrl, 'https://cdn.educationos.dev/demo/kepler.m3u8');
  });

  // 4. Test POST /storefront/:slug/enroll
  await t.test('POST /storefront/:slug/enroll provisions student and enrolls', async () => {
    const studentEmail = `student_${Date.now()}@example.org`;
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/public/storefront/${testSlugStr}/enroll`,
      payload: {
        courseId: course.id,
        email: studentEmail,
        name: 'Neil Armstrong'
      }
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.enrollment);
  });
});
