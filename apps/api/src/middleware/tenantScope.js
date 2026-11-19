function isDevAuthBypassEnabled() {
  return (
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
    process.env.ALLOW_DEV_AUTH_BYPASS === 'true'
  );
}

function getUserId(request) {
  const user = request.user || {};
  return user.userId || user.id || user.sub || null;
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

async function resolveTenantScope(request, reply) {
  const pathname = (request.url || '').split('?')[0];
  if (pathname.endsWith('/health')) {
    return;
  }

  const userId = getUserId(request);
  if (!userId) {
    return;
  }

  const requestedTenant =
    request.headers['x-tenant-id'] ||
    (request.body && request.body.tenantId) ||
    (request.query && request.query.tenantId) ||
    null;

  const normalizedRequested =
    typeof requestedTenant === 'string' && requestedTenant.trim() ? requestedTenant.trim() : null;

  // Dev/test bypass: no DB lookup or membership enforcement.
  if (isDevAuthBypassEnabled()) {
    request.memberships = [];
    request.tenantId = normalizedRequested;
    request.tenantRole = normalizedRequested ? 'ADMIN' : null;
    request.membership = null;
    request.tenantMismatch = false;
    return;
  }

  let memberships = [];
  try {
    const roleAssignmentRepository = request.container.resolve('RoleAssignmentRepository');
    memberships = await roleAssignmentRepository.findTenantsWithRolesForUser(userId);
  } catch (err) {
    request.log.error(`[TenantScope] Failed to resolve tenant memberships: ${err.message}`);
    return reply.status(503).send({
      success: false,
      error: 'Tenant authorization service unavailable. Please try again.'
    });
  }

  request.memberships = memberships || [];

  if (normalizedRequested) {
    const match = request.memberships.find(
      (m) => (m.tenantId || m.id) === normalizedRequested || m.slug === normalizedRequested
    );

    if (!match) {
      request.tenantId = null;
      request.tenantRole = null;
      request.membership = null;
      request.tenantMismatch = true;
      return;
    }

    request.tenantId = match.tenantId || match.id;
    request.tenantRole = match.role || null;
    request.membership = match;
    return;
  }

  const first = request.memberships[0] || null;
  request.tenantId = first ? first.tenantId || first.id : null;
  request.tenantRole = first ? first.role || null : null;
  request.membership = first;
  request.tenantMismatch = false;
}

function requireTenant(request, reply) {
  if (request.tenantMismatch) {
    reply.status(403).send({
      success: false,
      error: 'Forbidden: you are not a member of the requested tenant workspace.'
    });
    return false;
  }

  if (!request.tenantId && !isDevAuthBypassEnabled()) {
    reply.status(400).send({
      success: false,
      error: 'No active tenant workspace found for this account.'
    });
    return false;
  }

  return true;
}

async function checkPermission(request, permissionKey) {
  if (isDevAuthBypassEnabled()) {
    return true;
  }

  const userId = getUserId(request);
  if (!userId || !request.tenantId) {
    return false;
  }

  const roleAssignmentRepository = request.container.resolve('RoleAssignmentRepository');
  return roleAssignmentRepository.hasPermission({
    userId,
    tenantId: request.tenantId,
    organizationId: request.headers['x-organization-id'] || null,
    permissionKey
  });
}

async function assertPermission(request, reply, permissionKey) {
  const allowed = await checkPermission(request, permissionKey);
  if (!allowed) {
    reply.status(403).send({
      success: false,
      error: `Forbidden: missing required permission '${permissionKey}' in this tenant.`
    });
    return false;
  }
  return true;
}

module.exports = {
  isDevAuthBypassEnabled,
  getUserId,
  isUuid,
  resolveTenantScope,
  requireTenant,
  checkPermission,
  assertPermission
};
