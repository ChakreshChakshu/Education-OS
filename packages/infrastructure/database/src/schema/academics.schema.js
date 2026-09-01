const {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index
} = require('../drizzle-bridge');
const { tenantsTable, organizationsTable, usersTable } = require('./identity.schema');

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

// 1. Courses Table
const coursesTable = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
    organizationId: uuid('organization_id').references(() => organizationsTable.id),
    title: varchar('title', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    credits: integer('credits').notNull().default(3),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
    ...auditColumns
  },
  (table) => ({
    tenantCodeUq: uniqueIndex('uq_courses_tenant_code').on(table.tenantId, table.code),
    tenantIdx: index('idx_courses_tenant_id').on(table.tenantId),
    statusIdx: index('idx_courses_status').on(table.status)
  })
);

// 2. Batches Table
const batchesTable = pgTable(
  'batches',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id').notNull().references(() => coursesTable.id),
    name: varchar('name', { length: 255 }).notNull(),
    term: varchar('term', { length: 50 }),
    capacity: integer('capacity').notNull().default(50),
    instructorUserId: uuid('instructor_user_id').references(() => usersTable.id),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    ...auditColumns
  },
  (table) => ({
    courseIdx: index('idx_batches_course_id').on(table.courseId),
    instructorIdx: index('idx_batches_instructor_id').on(table.instructorUserId),
    statusIdx: index('idx_batches_status').on(table.status)
  })
);

// 3. Subjects Table
const subjectsTable = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id').notNull().references(() => coursesTable.id),
    title: varchar('title', { length: 255 }).notNull(),
    order: integer('order').notNull().default(1),
    description: text('description'),
    ...auditColumns
  },
  (table) => ({
    courseIdx: index('idx_subjects_course_id').on(table.courseId)
  })
);

module.exports = {
  coursesTable,
  batchesTable,
  subjectsTable
};
