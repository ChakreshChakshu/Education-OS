const test = require('node:test');
const assert = require('node:assert/strict');

const {
  Email,
  TenantSlug,
  User,
  Tenant,
  Organization,
  UserTenantMembership,
  OrganizationMembership
} = require('../domain');

const { RegisterUserUseCase, CreateTenantUseCase } = require('../application');

// In-Memory Test Repositories
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }
  async findById(id) {
    return this.users.get(id) || null;
  }
  async findByEmail(emailStr) {
    for (const u of this.users.values()) {
      if (u.email.value === emailStr) return u;
    }
    return null;
  }
  async save(user) {
    this.users.set(user.id, user);
  }
}

class InMemoryTenantRepository {
  constructor() {
    this.tenants = new Map();
    this.memberships = [];
  }
  async findById(id) {
    return this.tenants.get(id) || null;
  }
  async findBySlug(slugStr) {
    for (const t of this.tenants.values()) {
      if (t.slug.value === slugStr) return t;
    }
    return null;
  }
  async save(tenant) {
    this.tenants.set(tenant.id, tenant);
  }
  async saveUserMembership(membership) {
    this.memberships.push(membership);
  }
  async findUserMembership(userId, tenantId) {
    return (
      this.memberships.find(
        (m) => m.userId === userId && m.tenantId === tenantId
      ) || null
    );
  }
}

class InMemoryOrganizationRepository {
  constructor() {
    this.orgs = new Map();
    this.memberships = [];
  }
  async findById(id) {
    return this.orgs.get(id) || null;
  }
  async findByTenantId(tenantId) {
    return Array.from(this.orgs.values()).filter((o) => o.tenantId === tenantId);
  }
  async save(org) {
    this.orgs.set(org.id, org);
  }
  async saveMembership(membership) {
    this.memberships.push(membership);
  }
  async findMembership(userId, orgId) {
    return (
      this.memberships.find(
        (m) => m.userId === userId && m.organizationId === orgId
      ) || null
    );
  }
}

test('Email ValueObject validates format and normalizes case', () => {
  const valid = Email.create('  USER@Domain.com  ');
  assert.equal(valid.isSuccess, true);
  assert.equal(valid.getValue().value, 'user@domain.com');

  const invalid = Email.create('not-an-email');
  assert.equal(invalid.isFailure, true);
});

test('TenantSlug ValueObject validates format', () => {
  const valid = TenantSlug.create('skillyards-edu');
  assert.equal(valid.isSuccess, true);
  assert.equal(valid.getValue().value, 'skillyards-edu');

  const invalid = TenantSlug.create('Invalid Slug!');
  assert.equal(invalid.isFailure, true);
});

test('RegisterUserUseCase registers user successfully', async () => {
  const userRepo = new InMemoryUserRepository();
  const useCase = new RegisterUserUseCase({
    userRepository: userRepo,
    passwordHasher: { hash: async (p) => `hashed_${p}` }
  });

  const result = await useCase.execute({
    email: 'admin@skillyards.com',
    password: 'securePassword123',
    name: 'Admin User'
  });

  assert.equal(result.isSuccess, true);
  assert.equal(result.getValue().email, 'admin@skillyards.com');

  const savedUser = await userRepo.findByEmail('admin@skillyards.com');
  assert.notEqual(savedUser, null);
  assert.equal(savedUser.passwordHash, 'hashed_securePassword123');
});

test('CreateTenantUseCase provisions tenant, default org, and memberships', async () => {
  const userRepo = new InMemoryUserRepository();
  const tenantRepo = new InMemoryTenantRepository();
  const orgRepo = new InMemoryOrganizationRepository();

  // Register owner user first
  const regUseCase = new RegisterUserUseCase({
    userRepository: userRepo,
    passwordHasher: { hash: async (p) => `hashed_${p}` }
  });
  const userRes = await regUseCase.execute({
    email: 'owner@skillyards.com',
    password: 'password123',
    name: 'Tenant Owner'
  });
  const ownerId = userRes.getValue().id;

  const createTenantUseCase = new CreateTenantUseCase({
    tenantRepository: tenantRepo,
    userRepository: userRepo,
    organizationRepository: orgRepo
  });

  const result = await createTenantUseCase.execute({
    name: 'SkillYards Academy',
    slug: 'skillyards',
    ownerUserId: ownerId,
    orgName: 'Delhi HQ',
    orgCode: 'DEL'
  });

  assert.equal(result.isSuccess, true);
  const data = result.getValue();
  assert.equal(data.tenant.slug, 'skillyards');
  assert.equal(data.organization.name, 'Delhi HQ');
  assert.equal(data.membership.role, 'TENANT_OWNER');

  // Verify stored relationships
  const tenant = await tenantRepo.findBySlug('skillyards');
  assert.notEqual(tenant, null);
  assert.equal(tenantRepo.memberships.length, 1);
  assert.equal(orgRepo.memberships.length, 1);
  assert.equal(orgRepo.memberships[0].role, 'TENANT_OWNER');
});
