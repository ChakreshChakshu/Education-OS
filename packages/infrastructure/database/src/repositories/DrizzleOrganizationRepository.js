const { BaseRepository } = require('./BaseRepository');
const { organizationsTable, organizationMembershipsTable } = require('../schema/identity.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleOrganizationRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = organizationsTable;
    this.omTable = organizationMembershipsTable;
    this._orgStore = new Map();
    this._membershipStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { Organization } = require('../domain-identity-bridge');

    const orgRes = Organization.create(
      {
        tenantId: row.tenantId || row.tenant_id,
        name: row.name,
        code: row.code,
        status: row.status,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return orgRes.isSuccess ? orgRes.getValue() : null;
  }

  static toPersistence(organization) {
    return {
      id: organization.id,
      tenantId: organization.tenantId,
      name: organization.name,
      code: organization.code,
      status: organization.status,
      createdAt: organization.props.createdAt,
      updatedAt: organization.props.updatedAt,
      deletedAt: organization.props.deletedAt,
      version: organization.props.version || 1
    };
  }

  static membershipToDomain(row) {
    if (!row) return null;
    const { OrganizationMembership } = require('../domain-identity-bridge');
    const res = OrganizationMembership.create(
      {
        organizationId: row.organizationId || row.organization_id,
        userId: row.userId || row.user_id,
        role: row.role,
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
      organizationId: membership.organizationId,
      userId: membership.userId,
      role: membership.role,
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
      return rows[0] ? DrizzleOrganizationRepository.toDomain(rows[0]) : null;
    }
    const raw = this._orgStore.get(id);
    return raw ? DrizzleOrganizationRepository.toDomain(raw) : null;
  }

  async findByTenantId(tenantId) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.tenantId, tenantId), isNull(this.table.deletedAt)));
      return rows.map((r) => DrizzleOrganizationRepository.toDomain(r)).filter(Boolean);
    }
    const results = [];
    for (const raw of this._orgStore.values()) {
      if (raw.tenantId === tenantId && !raw.deletedAt) {
        const dom = DrizzleOrganizationRepository.toDomain(raw);
        if (dom) results.push(dom);
      }
    }
    return results;
  }

  async save(organization) {
    const raw = DrizzleOrganizationRepository.toPersistence(organization);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._orgStore.set(organization.id, raw);
    return organization;
  }

  async saveMembership(membership) {
    const raw = DrizzleOrganizationRepository.membershipToPersistence(membership);
    if (this.db && this.db.insert) {
      await this.db.insert(this.omTable).values(raw).onConflictDoUpdate({
        target: this.omTable.id,
        set: raw
      });
    }
    this._membershipStore.set(membership.id, raw);
    return membership;
  }

  async findMembership(userId, organizationId) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.omTable)
        .where(and(eq(this.omTable.userId, userId), eq(this.omTable.organizationId, organizationId)))
        .limit(1);
      return rows[0] ? DrizzleOrganizationRepository.membershipToDomain(rows[0]) : null;
    }
    for (const raw of this._membershipStore.values()) {
      if (raw.userId === userId && raw.organizationId === organizationId) {
        return DrizzleOrganizationRepository.membershipToDomain(raw);
      }
    }
    return null;
  }
}

module.exports = { DrizzleOrganizationRepository };
