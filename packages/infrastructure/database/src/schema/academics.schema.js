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

// 4. Enrollments Table
const enrollmentsTable = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
    studentUserId: uuid('student_user_id').notNull().references(() => usersTable.id),
    courseId: uuid('course_id').notNull().references(() => coursesTable.id),
    batchId: uuid('batch_id').references(() => batchesTable.id),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    progressPercentage: integer('progress_percentage').notNull().default(0),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    studentCourseUq: uniqueIndex('uq_enrollments_student_course').on(table.studentUserId, table.courseId),
    tenantIdx: index('idx_enrollments_tenant_id').on(table.tenantId),
    studentIdx: index('idx_enrollments_student_id').on(table.studentUserId),
    courseIdx: index('idx_enrollments_course_id').on(table.courseId),
    batchIdx: index('idx_enrollments_batch_id').on(table.batchId)
  })
);

module.exports = {
  coursesTable,
  batchesTable,
  subjectsTable,
  enrollmentsTable
};
