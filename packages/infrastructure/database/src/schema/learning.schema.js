const {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  index
} = require('../drizzle-bridge');
const { usersTable } = require('./identity.schema');
const { coursesTable, batchesTable } = require('./academics.schema');

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

// 1. Lesson Modules Table
const lessonModulesTable = pgTable(
  'lesson_modules',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id').notNull().references(() => coursesTable.id),
    title: varchar('title', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull().default('VIDEO'),
    contentUrl: text('content_url'),
    order: integer('order').notNull().default(1),
    status: varchar('status', { length: 50 }).notNull().default('PUBLISHED'),
    ...auditColumns
  },
  (table) => ({
    courseIdx: index('idx_lesson_modules_course_id').on(table.courseId)
  })
);

// 2. Student Progress Table
const studentProgressTable = pgTable(
  'student_progress',
  {
    id: uuid('id').primaryKey(),
    studentUserId: uuid('student_user_id').notNull().references(() => usersTable.id),
    batchId: uuid('batch_id').references(() => batchesTable.id),
    lessonModuleId: uuid('lesson_module_id').notNull().references(() => lessonModulesTable.id),
    status: varchar('status', { length: 50 }).notNull().default('COMPLETED'),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns
  },
  (table) => ({
    studentIdx: index('idx_sp_student_id').on(table.studentUserId),
    moduleIdx: index('idx_sp_module_id').on(table.lessonModuleId)
  })
);

// 3. Quiz Submissions Table
const quizSubmissionsTable = pgTable(
  'quiz_submissions',
  {
    id: uuid('id').primaryKey(),
    studentUserId: uuid('student_user_id').notNull().references(() => usersTable.id),
    lessonModuleId: uuid('lesson_module_id').notNull().references(() => lessonModulesTable.id),
    score: doublePrecision('score').notNull(),
    passed: boolean('passed').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    studentIdx: index('idx_qs_student_id').on(table.studentUserId),
    moduleIdx: index('idx_qs_module_id').on(table.lessonModuleId)
  })
);

module.exports = {
  lessonModulesTable,
  studentProgressTable,
  quizSubmissionsTable
};
