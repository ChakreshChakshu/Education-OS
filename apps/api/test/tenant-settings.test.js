const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const Fastify = require('fastify');

const internalRoutes = require('../src/routes/v1/internal');
const { identityDomain } = require('../src/bootstrap/domain-bridge');

test('new workspace branding stays bound to the created tenant across an auth retry', async (t) => {
  const { UpdateTenantSettingsUseCase } = identityDomain.application;
  const { Tenant } = identityDomain.domain;
  const previous = Tenant.create({
    name: 'Previous workspace',
    slug: 'previous-workspace',
    settingsJson: { branding: { primaryColor: '#000000' } }
  }).getValue();
  const tenants = new Map([[previous.id, previous]]);
  const userId = randomUUID();
  const services = {
    TokenService: { verifyToken: (token) => token === 'session' ? { userId } : null },
    RoleAssignmentRepository: {
      findTenantsWithRolesForUser: async () => [...tenants.keys()].map((tenantId) => ({ tenantId })),
      hasPermission: async ({ tenantId, permissionKey }) => tenants.has(tenantId) && permissionKey === 'tenant.manage'
    },
    CreateTenantUseCase: {
      execute: async ({ name, slug }) => {
        const created = Tenant.create({ name, slug }).getValue();
        tenants.set(created.id, created);
        return { isFailure: false, getValue: () => ({ tenant: { id: created.id, name: created.name } }) };
      }
    },
    UpdateTenantSettingsUseCase: new UpdateTenantSettingsUseCase({
      tenantRepository: {
        findById: async (id) => tenants.get(id),
        save: async (tenant) => tenants.set(tenant.id, tenant)
      }
    })
  };

  const app = Fastify();
  t.after(() => app.close());
  await app.register(internalRoutes, {
    prefix: '/api/v1/internal',
    container: { resolve: (name) => services[name] }
  });
  let activeTenantId = previous.id;
  let session = 'session';
  app.post('/api/v1/public/auth/refresh', async () => {
    activeTenantId = randomUUID();
    session = 'session';
    return { success: true };
  });

  for (const [name, value] of Object.entries({
    window: {},
    localStorage: { getItem: (key) => key === 'eos_tenant_id' ? activeTenantId : null }
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    });
  }
  const settingsTargets = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'PATCH') settingsTargets.push(options.headers['x-tenant-id']);
    const response = await app.inject({
      method: options.method,
      url,
      headers: { ...options.headers, authorization: `Bearer ${session}` },
      payload: options.body
    });
    return { ok: response.statusCode < 400, status: response.statusCode, json: () => response.json() };
  });

  const { ApiClient } = await import('../../web/lib/api.js');
  const creation = await ApiClient.createTenant({ name: 'New workspace', slug: 'new-workspace' });
  assert.equal(creation.success, true);
  const created = tenants.get(creation.data.tenant.id);
  const settingsJson = { branding: { primaryColor: '#123456' } };
  session = 'expired';

  const result = await ApiClient.updateTenantSettings({ tenantId: created.id, settingsJson });
  assert.equal(result.success, true);
  assert.deepEqual(settingsTargets, [created.id, created.id]);
  assert.deepEqual(created.settingsJson, settingsJson);
  assert.deepEqual(previous.settingsJson, { branding: { primaryColor: '#000000' } });

  const mismatch = await app.inject({
    method: 'PATCH',
    url: '/api/v1/internal/tenants/current/settings',
    headers: { authorization: 'Bearer session', 'x-tenant-id': previous.id },
    payload: { tenantId: created.id, settingsJson }
  });
  assert.equal(mismatch.statusCode, 409);
  assert.deepEqual(previous.settingsJson, { branding: { primaryColor: '#000000' } });

  activeTenantId = created.id;
  const ordinarySave = await ApiClient.updateTenantSettings({ name: 'Renamed workspace' });
  assert.equal(ordinarySave.success, true);
  assert.equal(created.name, 'Renamed workspace');
});
