const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { schema, DrizzleUserRepository, DrizzleTenantRepository, DrizzleOrganizationRepository } = require('../src');
const { User, Tenant, Organization, UserTenantMembership, OrganizationMembership } = require('../src/domain-identity-bridge');

test('Database schema exports identity tables', () => {
  assert.notEqual(schema.usersTable, undefined);
  assert.notEqual(schema.tenantsTable, undefined);
  assert.notEqual(schema.organizationsTable, undefined);
  assert.notEqual(schema.userTenantMembershipsTable, undefined);
  assert.notEqual(schema.organizationMembershipsTable, undefined);
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
