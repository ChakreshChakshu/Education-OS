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

const {
  RegisterUserUseCase,
  CreateTenantUseCase,
  LoginUserUseCase,
  RefreshTokenUseCase,
  LogoutUseCase
} = require('../application');
const crypto = require('crypto');

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

class InMemoryUserSessionRepository {
  constructor() {
    this.sessions = new Map();
  }
  async create(session) {
    this.sessions.set(session.id, { ...session, revokedAt: null });
    return session;
  }
  async findActiveByRefreshTokenHash(hash) {
    for (const s of this.sessions.values()) {
      if (s.refreshTokenHash === hash && !s.revokedAt && s.expiresAt > new Date()) return s;
    }
    return null;
  }
  async revoke(id) {
    const s = this.sessions.get(id);
    if (s) s.revokedAt = new Date();
  }
  async revokeByRefreshTokenHash(hash) {
    for (const s of this.sessions.values()) {
      if (s.refreshTokenHash === hash) s.revokedAt = new Date();
    }
  }
}

class InMemoryRoleAssignmentRepository {
  constructor() {
    this.assignments = [];
  }
  async assignRole({ userId, tenantId, organizationId, roleName }) {
    this.assignments.push({ userId, tenantId, organizationId, roleName });
  }
  async findTenantsWithRolesForUser(userId) {
    return this.assignments
      .filter((a) => a.userId === userId)
      .map((a) => ({ tenantId: a.tenantId, organizationId: a.organizationId, role: a.roleName, name: 'Test Tenant', slug: 'test-tenant' }));
  }
}

const fakeTokenService = {
  generateToken: (payload) => `fake-jwt.${JSON.stringify(payload)}`,
  verifyToken: (token) => null
};

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

test('CreateTenantUseCase grants tenant-wide ADMIN role assignment when a RoleAssignmentRepository is provided', async () => {
  const userRepo = new InMemoryUserRepository();
  const tenantRepo = new InMemoryTenantRepository();
  const orgRepo = new InMemoryOrganizationRepository();
  const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();

  const regUseCase = new RegisterUserUseCase({
    userRepository: userRepo,
    passwordHasher: { hash: async (p) => `hashed_${p}` }
  });
  const ownerId = (
    await regUseCase.execute({ email: 'owner2@skillyards.com', password: 'password123', name: 'Owner Two' })
  ).getValue().id;

  const createTenantUseCase = new CreateTenantUseCase({
    tenantRepository: tenantRepo,
    userRepository: userRepo,
    organizationRepository: orgRepo,
    roleAssignmentRepository: roleAssignmentRepo
  });

  const result = await createTenantUseCase.execute({
    name: 'RBAC Test Tenant',
    slug: 'rbac-test-tenant',
    ownerUserId: ownerId
  });

  assert.equal(result.isSuccess, true);
  assert.equal(roleAssignmentRepo.assignments.length, 1);
  assert.equal(roleAssignmentRepo.assignments[0].roleName, 'ADMIN');
  assert.equal(roleAssignmentRepo.assignments[0].organizationId, null);
});

test('LoginUserUseCase issues an access token, persists a hashed refresh token session, and returns tenants', async () => {
  const userRepo = new InMemoryUserRepository();
  const sessionRepo = new InMemoryUserSessionRepository();
  const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();

  const passwordHasher = {
    hash: async (p) => `hashed_${p}`,
    compare: async (p, hash) => hash === `hashed_${p}`
  };

  const regUseCase = new RegisterUserUseCase({ userRepository: userRepo, passwordHasher });
  const userId = (
    await regUseCase.execute({ email: 'login-test@skillyards.com', password: 'password123', name: 'Login Test' })
  ).getValue().id;
  await roleAssignmentRepo.assignRole({ userId, tenantId: 'tenant-1', organizationId: null, roleName: 'ADMIN' });

  const loginUseCase = new LoginUserUseCase({
    userRepository: userRepo,
    passwordHasher,
    tokenService: fakeTokenService,
    userSessionRepository: sessionRepo,
    roleAssignmentRepository: roleAssignmentRepo
  });

  const result = await loginUseCase.execute({ email: 'login-test@skillyards.com', password: 'password123' });

  assert.equal(result.isSuccess, true);
  const data = result.getValue();
  assert.equal(typeof data.accessToken, 'string');
  assert.equal(typeof data.refreshToken, 'string');
  assert.equal(data.tenants.length, 1);
  assert.equal(data.tenants[0].role, 'ADMIN');

  // The raw refresh token must never be stored — only its SHA-256 hash.
  assert.equal(sessionRepo.sessions.size, 1);
  const storedSession = [...sessionRepo.sessions.values()][0];
  assert.notEqual(storedSession.refreshTokenHash, data.refreshToken);
  assert.equal(storedSession.refreshTokenHash, crypto.createHash('sha256').update(data.refreshToken).digest('hex'));
});

test('LoginUserUseCase rejects an incorrect password', async () => {
  const userRepo = new InMemoryUserRepository();
  const passwordHasher = {
    hash: async (p) => `hashed_${p}`,
    compare: async (p, hash) => hash === `hashed_${p}`
  };
  const regUseCase = new RegisterUserUseCase({ userRepository: userRepo, passwordHasher });
  await regUseCase.execute({ email: 'wrongpass@skillyards.com', password: 'correctPassword', name: 'Someone' });

  const loginUseCase = new LoginUserUseCase({
    userRepository: userRepo,
    passwordHasher,
    tokenService: fakeTokenService
  });

  const result = await loginUseCase.execute({ email: 'wrongpass@skillyards.com', password: 'wrongPassword' });
  assert.equal(result.isFailure, true);
});

test('RefreshTokenUseCase rotates the refresh token and rejects reuse of the old one', async () => {
  const userRepo = new InMemoryUserRepository();
  const sessionRepo = new InMemoryUserSessionRepository();
  const passwordHasher = { hash: async (p) => `hashed_${p}`, compare: async (p, hash) => hash === `hashed_${p}` };

  const regUseCase = new RegisterUserUseCase({ userRepository: userRepo, passwordHasher });
  const userId = (
    await regUseCase.execute({ email: 'refresh-test@skillyards.com', password: 'password123', name: 'Refresh Test' })
  ).getValue().id;

  const loginUseCase = new LoginUserUseCase({
    userRepository: userRepo,
    passwordHasher,
    tokenService: fakeTokenService,
    userSessionRepository: sessionRepo
  });
  const loginData = (
    await loginUseCase.execute({ email: 'refresh-test@skillyards.com', password: 'password123' })
  ).getValue();

  const refreshUseCase = new RefreshTokenUseCase({
    userSessionRepository: sessionRepo,
    userRepository: userRepo,
    tokenService: fakeTokenService
  });

  const refreshResult = await refreshUseCase.execute({ refreshToken: loginData.refreshToken });
  assert.equal(refreshResult.isSuccess, true);
  const newTokens = refreshResult.getValue();
  assert.notEqual(newTokens.refreshToken, loginData.refreshToken);

  // Reusing the rotated-out (old) refresh token must now fail.
  const reuseResult = await refreshUseCase.execute({ refreshToken: loginData.refreshToken });
  assert.equal(reuseResult.isFailure, true);

  // The newly issued refresh token still works.
  const secondRefresh = await refreshUseCase.execute({ refreshToken: newTokens.refreshToken });
  assert.equal(secondRefresh.isSuccess, true);
});

test('LogoutUseCase revokes the session so its refresh token can no longer be used', async () => {
  const userRepo = new InMemoryUserRepository();
  const sessionRepo = new InMemoryUserSessionRepository();
  const passwordHasher = { hash: async (p) => `hashed_${p}`, compare: async (p, hash) => hash === `hashed_${p}` };

  const regUseCase = new RegisterUserUseCase({ userRepository: userRepo, passwordHasher });
  await regUseCase.execute({ email: 'logout-test@skillyards.com', password: 'password123', name: 'Logout Test' });

  const loginUseCase = new LoginUserUseCase({
    userRepository: userRepo,
    passwordHasher,
    tokenService: fakeTokenService,
    userSessionRepository: sessionRepo
  });
  const loginData = (
    await loginUseCase.execute({ email: 'logout-test@skillyards.com', password: 'password123' })
  ).getValue();

  const logoutUseCase = new LogoutUseCase({ userSessionRepository: sessionRepo });
  const logoutResult = await logoutUseCase.execute({ refreshToken: loginData.refreshToken });
  assert.equal(logoutResult.isSuccess, true);

  const refreshUseCase = new RefreshTokenUseCase({
    userSessionRepository: sessionRepo,
    userRepository: userRepo,
    tokenService: fakeTokenService
  });
  const refreshAfterLogout = await refreshUseCase.execute({ refreshToken: loginData.refreshToken });
  assert.equal(refreshAfterLogout.isFailure, true);
});
