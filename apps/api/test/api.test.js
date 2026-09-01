const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const crypto = require('crypto');

const { container } = require('../src/bootstrap/container');
const { registerProviders } = require('../src/bootstrap/providers');
const { registerServices } = require('../src/bootstrap/services');
const internalV1Routes = require('../src/routes/v1/internal');
const publicV1Routes = require('../src/routes/v1/public');

async function buildApp() {
  const app = Fastify();
  registerProviders(container);
  registerServices(container);

  await app.register(internalV1Routes, { prefix: '/api/v1/internal', container });
  await app.register(publicV1Routes, { prefix: '/api/v1/public', container });

  return app;
}

test('POST /api/v1/public/auth/register creates a user successfully', async () => {
  const app = await buildApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/register',
    payload: {
      email: 'alice@skillyards.com',
      password: 'SecurePassword123',
      name: 'Alice Johnson'
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.name, 'Alice Johnson');
  assert.equal(body.data.email, 'alice@skillyards.com');
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

  // Resolve user repository from container after app initialization
  const userRepo = container.resolve('UserRepository');
  const { User } = require('../src/bootstrap/domain-bridge').identityDomain.domain;
  const user = User.create(
    {
      email: 'owner@institution.com',
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
      slug: 'metropolitan-academy',
      ownerUserId: ownerUserId
    }
  });

  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.tenant.name, 'Metropolitan Academy');
  assert.equal(body.data.tenant.slug, 'metropolitan-academy');
  assert.equal(body.data.organization.name, 'Main Branch');
  assert.equal(body.data.membership.role, 'TENANT_OWNER');
});
