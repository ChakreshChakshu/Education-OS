const { BaseRepository } = require('./BaseRepository');
const { randomUUID } = require('crypto');

class DrizzleRoleAssignmentRepository extends BaseRepository {
  /**
   * Assigns a named role to a user within a tenant (and optionally a specific organization).
   * Idempotent — assigning the same role twice is a no-op.
   */
  async assignRole({ userId, tenantId, organizationId = null, roleName }) {
    const db = await this.db.connect();

    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [roleName]);
    const role = roleRes.rows[0];
    if (!role) {
      throw new Error(`Cannot assign unknown role "${roleName}" — has seedRbacDefaults() run?`);
    }

    await db.query(
      `INSERT INTO role_assignments (id, user_id, tenant_id, organization_id, role_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, tenant_id, organization_id, role_id) DO NOTHING`,
      [randomUUID(), userId, tenantId, organizationId, role.id]
    );
  }

  /**
   * Returns every tenant a user has a role in, with the role name resolved,
   * for populating the tenant switcher after login/registration.
   */
  async findTenantsWithRolesForUser(userId) {
    const db = await this.db.connect();
    const res = await db.query(
      `SELECT ra.tenant_id, ra.organization_id, r.name AS role_name,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM role_assignments ra
       JOIN roles r ON r.id = ra.role_id
       JOIN tenants t ON t.id = ra.tenant_id
       WHERE ra.user_id = $1 AND t.deleted_at IS NULL
       ORDER BY ra.created_at ASC`,
      [userId]
    );
    return res.rows.map((row) => ({
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      role: row.role_name,
      name: row.tenant_name,
      slug: row.tenant_slug
    }));
  }

  /**
   * Checks whether a user holds a permission within a tenant, either via a
   * tenant-wide role assignment (organization_id IS NULL) or one scoped to
   * the given organization.
   */
  async hasPermission({ userId, tenantId, organizationId = null, permissionKey }) {
    const db = await this.db.connect();
    const res = await db.query(
      `SELECT 1
       FROM role_assignments ra
       JOIN role_permissions rp ON rp.role_id = ra.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ra.user_id = $1
         AND ra.tenant_id = $2
         AND (ra.organization_id IS NULL OR ra.organization_id = $3)
         AND p.key = $4
       LIMIT 1`,
      [userId, tenantId, organizationId, permissionKey]
    );
    return res.rows.length > 0;
  }
}

module.exports = { DrizzleRoleAssignmentRepository };
