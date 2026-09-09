const { randomUUID } = require('crypto');

// Permission keys follow the `resource.action` convention from docs/auth_and_authorization.md.
const PERMISSIONS = [
  'course.read',
  'course.create',
  'course.update',
  'course.delete',
  'lesson.read',
  'lesson.publish',
  'assessment.submit',
  'media.upload',
  'tenant.manage',
  'organization.invite',
  'user.suspend'
];

const ROLES = {
  ADMIN: PERMISSIONS,
  INSTRUCTOR: [
    'course.read',
    'course.create',
    'course.update',
    'lesson.read',
    'lesson.publish',
    'assessment.submit',
    'media.upload'
  ],
  STUDENT: ['course.read', 'lesson.read', 'assessment.submit']
};

/**
 * Idempotently seeds the default roles, permissions, and role-permission
 * mappings described in docs/auth_and_authorization.md. Safe to call on
 * every API boot — every insert is ON CONFLICT DO NOTHING.
 */
async function seedRbacDefaults(dbClient) {
  const db = await dbClient.connect();
  if (typeof db.query !== 'function') {
    // Drizzle query-builder path — no seed support needed while the raw pg
    // driver remains the only path actually exercised in this codebase.
    return;
  }

  for (const key of PERMISSIONS) {
    await db.query(
      `INSERT INTO permissions (id, key) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [randomUUID(), key]
    );
  }

  for (const roleName of Object.keys(ROLES)) {
    await db.query(
      `INSERT INTO roles (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [randomUUID(), roleName]
    );

    const roleRow = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    const roleId = roleRow.rows[0].id;

    for (const permissionKey of ROLES[roleName]) {
      const permRow = await db.query('SELECT id FROM permissions WHERE key = $1', [permissionKey]);
      const permissionId = permRow.rows[0].id;

      await db.query(
        `INSERT INTO role_permissions (id, role_id, permission_id)
         VALUES ($1, $2, $3) ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [randomUUID(), roleId, permissionId]
      );
    }
  }
}

module.exports = { seedRbacDefaults, PERMISSIONS, ROLES };
