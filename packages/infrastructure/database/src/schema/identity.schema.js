const {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index
} = require('../drizzle-bridge');

// Standard audit column helper
const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
  version: integer('version').notNull().default(1)
};

// 1. Users Table
const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    avatar: text('avatar'),
    phone: varchar('phone', { length: 50 }),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),
    language: varchar('language', { length: 10 }).default('en'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    ...auditColumns
  },
  (table) => ({
    emailIdx: uniqueIndex('idx_users_email').on(table.email),
    statusIdx: index('idx_users_status').on(table.status)
  })
);

// 2. Tenants Table
const tenantsTable = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    settingsJson: jsonb('settings_json').default({}),
    ...auditColumns
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_tenants_slug').on(table.slug),
    statusIdx: index('idx_tenants_status').on(table.status)
  })
);

// 3. Organizations Table
const organizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    ...auditColumns
  },
  (table) => ({
    tenantIdx: index('idx_orgs_tenant_id').on(table.tenantId),
    statusIdx: index('idx_orgs_status').on(table.status)
  })
);

// 4. User Tenant Memberships Table
const userTenantMembershipsTable = pgTable(
  'user_tenant_memberships',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => usersTable.id),
    tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userTenantUq: uniqueIndex('uq_user_tenant').on(table.userId, table.tenantId),
    userMemberIdx: index('idx_utm_user_id').on(table.userId),
    tenantMemberIdx: index('idx_utm_tenant_id').on(table.tenantId)
  })
);

// 5. Organization Memberships Table
const organizationMembershipsTable = pgTable(
  'organization_memberships',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id').notNull().references(() => organizationsTable.id),
    userId: uuid('user_id').notNull().references(() => usersTable.id),
    role: varchar('role', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orgUserUq: uniqueIndex('uq_org_user').on(table.organizationId, table.userId),
    orgMemberIdx: index('idx_om_org_id').on(table.organizationId),
    userOrgMemberIdx: index('idx_om_user_id').on(table.userId)
  })
);

module.exports = {
  usersTable,
  tenantsTable,
  organizationsTable,
  userTenantMembershipsTable,
  organizationMembershipsTable
};
