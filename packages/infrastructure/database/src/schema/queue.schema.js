const { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } = require('../drizzle-bridge');

const outboxEventsTable = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey(),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, DISPATCHED, FAILED
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    statusCreatedIdx: index('idx_outbox_status_created').on(table.status, table.createdAt)
  })
);

const jobsTable = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey(),
    jobName: varchar('job_name', { length: 100 }).notNull(),
    queueName: varchar('queue_name', { length: 50 }).notNull().default('default'),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, DEAD_LETTER
    priority: integer('priority').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    statusAvailableIdx: index('idx_jobs_status_available').on(table.status, table.availableAt),
    queueNameIdx: index('idx_jobs_queue_name').on(table.queueName)
  })
);

module.exports = {
  outboxEventsTable,
  jobsTable
};
