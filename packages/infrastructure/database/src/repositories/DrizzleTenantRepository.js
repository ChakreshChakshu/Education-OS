const { BaseRepository } = require('./BaseRepository');
const { tenantsTable, userTenantMembershipsTable } = require('../schema/identity.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleTenantRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = tenantsTable;
    this.utmTable = userTenantMembershipsTable;
  }

  static toDomain(row) {
    if (!row) return null;
    const { Tenant, TenantSlug } = require('../domain-identity-bridge');

    const slugRes = TenantSlug.create(row.slug);
    if (slugRes.isFailure) return null;

    const tenantRes = Tenant.create(
      {
        name: row.name,
        slug: slugRes.getValue(),
        status: row.status,
        settingsJson: row.settingsJson || row.settings_json || {},
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return tenantRes.isSuccess ? tenantRes.getValue() : null;
  }

  static toPersistence(tenant) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug.value,
      status: tenant.status,
      settingsJson: tenant.settingsJson,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      deletedAt: tenant.props.deletedAt,
      version: tenant.props.version || 1
    };
  }

  static membershipToDomain(row) {
    if (!row) return null;
    const { UserTenantMembership } = require('../domain-identity-bridge');
    const res = UserTenantMembership.create(
      {
        userId: row.userId || row.user_id,
        tenantId: row.tenantId || row.tenant_id,
        status: row.status,
        joinedAt: row.joinedAt || row.joined_at,
        lastActiveAt: row.lastActiveAt || row.last_active_at,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at
      },
      row.id
    );
    return res.isSuccess ? res.getValue() : null;
  }

  static membershipToPersistence(membership) {
    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      status: membership.status,
      joinedAt: membership.props.joinedAt,
      lastActiveAt: membership.props.lastActiveAt,
      createdAt: membership.props.createdAt,
      updatedAt: membership.props.updatedAt
    };
  }

  async findById(id) {
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleTenantRepository.toDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
    return res.rows[0] ? DrizzleTenantRepository.toDomain(res.rows[0]) : null;
  }

  async findBySlug(slugStr) {
    const lower = slugStr.toLowerCase();
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.slug, lower), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleTenantRepository.toDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM tenants WHERE LOWER(slug) = $1 AND deleted_at IS NULL LIMIT 1', [lower]);
    return res.rows[0] ? DrizzleTenantRepository.toDomain(res.rows[0]) : null;
  }

  async save(tenant) {
    const raw = DrizzleTenantRepository.toPersistence(tenant);
    const db = await this.db.connect();
    if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    } else {
      await db.query(`
        INSERT INTO tenants (id, name, slug, status, settings_json, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          updated_at = NOW();
      `, [raw.id, raw.name, raw.slug, raw.status, JSON.stringify(raw.settingsJson || {}), raw.createdAt, raw.updatedAt]);
    }
    return tenant;
  }

  async saveUserMembership(membership) {
    const raw = DrizzleTenantRepository.membershipToPersistence(membership);
    const db = await this.db.connect();
    if (db.insert) {
      await db.insert(this.utmTable).values(raw).onConflictDoUpdate({
        target: this.utmTable.id,
        set: raw
      });
    } else {
      await db.query(`
        INSERT INTO user_tenant_memberships (id, user_id, tenant_id, status, joined_at, last_active_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();
      `, [raw.id, raw.userId, raw.tenantId, raw.status, raw.joinedAt, raw.lastActiveAt, raw.createdAt, raw.updatedAt]);
    }
    return membership;
  }

  async findUserMembership(userId, tenantId) {
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.utmTable)
        .where(and(eq(this.utmTable.userId, userId), eq(this.utmTable.tenantId, tenantId)))
        .limit(1);
      return rows[0] ? DrizzleTenantRepository.membershipToDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM user_tenant_memberships WHERE user_id = $1 AND tenant_id = $2 LIMIT 1', [userId, tenantId]);
    return res.rows[0] ? DrizzleTenantRepository.membershipToDomain(res.rows[0]) : null;
  }
}

module.exports = { DrizzleTenantRepository };
