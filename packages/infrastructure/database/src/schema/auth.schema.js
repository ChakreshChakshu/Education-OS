const {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index
} = require('../drizzle-bridge');

// 1. User Sessions Table (Opaque Refresh Token Storage)
const userSessionsTable = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull().unique(),
    deviceName: varchar('device_name', { length: 100 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    hashIdx: uniqueIndex('idx_sessions_refresh_hash').on(table.refreshTokenHash),
    userIdx: index('idx_sessions_user_id').on(table.userId)
  })
);

// 2. Roles Table
const rolesTable = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    nameIdx: uniqueIndex('idx_roles_name').on(table.name)
  })
);

// 3. Permissions Table
const permissionsTable = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey(),
    key: varchar('key', { length: 100 }).notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    keyIdx: uniqueIndex('idx_permissions_key').on(table.key)
  })
);

// 4. Role Permissions Table
const rolePermissionsTable = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey(),
    roleId: uuid('role_id').notNull(),
    permissionId: uuid('permission_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    rolePermUq: uniqueIndex('uq_role_permission').on(table.roleId, table.permissionId)
  })
);

// 5. Role Assignments Table (Scoped Multi-Tenant RBAC)
const roleAssignmentsTable = pgTable(
  'role_assignments',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    organizationId: uuid('organization_id'),
    roleId: uuid('role_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userTenantIdx: index('idx_role_assignments_user_tenant').on(table.userId, table.tenantId)
  })
);

module.exports = {
  userSessionsTable,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  roleAssignmentsTable
};
