const { BaseRepository } = require('./BaseRepository');
const { tenantsTable, userTenantMembershipsTable } = require('../schema/identity.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleTenantRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = tenantsTable;
    this.utmTable = userTenantMembershipsTable;
    this._tenantStore = new Map();
    this._membershipStore = new Map();
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
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleTenantRepository.toDomain(rows[0]) : null;
    }
    const raw = this._tenantStore.get(id);
    return raw ? DrizzleTenantRepository.toDomain(raw) : null;
  }

  async findBySlug(slugStr) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.slug, slugStr.toLowerCase()), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleTenantRepository.toDomain(rows[0]) : null;
    }
    const lower = slugStr.toLowerCase();
    for (const raw of this._tenantStore.values()) {
      if (raw.slug.toLowerCase() === lower && !raw.deletedAt) {
        return DrizzleTenantRepository.toDomain(raw);
      }
    }
    return null;
  }

  async save(tenant) {
    const raw = DrizzleTenantRepository.toPersistence(tenant);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._tenantStore.set(tenant.id, raw);
    return tenant;
  }

  async saveUserMembership(membership) {
    const raw = DrizzleTenantRepository.membershipToPersistence(membership);
    if (this.db && this.db.insert) {
      await this.db.insert(this.utmTable).values(raw).onConflictDoUpdate({
        target: this.utmTable.id,
        set: raw
      });
    }
    this._membershipStore.set(membership.id, raw);
    return membership;
  }

  async findUserMembership(userId, tenantId) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.utmTable)
        .where(and(eq(this.utmTable.userId, userId), eq(this.utmTable.tenantId, tenantId)))
        .limit(1);
      return rows[0] ? DrizzleTenantRepository.membershipToDomain(rows[0]) : null;
    }
    for (const raw of this._membershipStore.values()) {
      if (raw.userId === userId && raw.tenantId === tenantId) {
        return DrizzleTenantRepository.membershipToDomain(raw);
      }
    }
    return null;
  }
}

module.exports = { DrizzleTenantRepository };
