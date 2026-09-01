const { pgTable, uuid, varchar, text, timestamp, integer, index } = require('../drizzle-bridge');
const { tenantsTable, usersTable } = require('./identity.schema');

const mediaAssetsTable = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
    uploaderUserId: uuid('uploader_user_id').references(() => usersTable.id),
    filename: varchar('filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageKey: text('storage_key').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PENDING_UPLOAD'),
    hlsManifestUrl: text('hls_manifest_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => ({
    tenantIdx: index('idx_media_tenant_id').on(table.tenantId),
    storageKeyIdx: index('idx_media_storage_key').on(table.storageKey)
  })
);

module.exports = { mediaAssetsTable };
