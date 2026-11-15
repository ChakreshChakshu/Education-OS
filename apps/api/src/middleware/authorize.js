const {
  isDevAuthBypassEnabled,
  requireTenant,
  checkPermission,
  getUserId
} = require('./tenantScope');

// Permissions are resolved from role_assignments at request time, never from JWT claims.
function authorize(permissionKey) {
  return async function authorizeHandler(request, reply) {
    if (isDevAuthBypassEnabled()) {
      return;
    }

    const userId = getUserId(request);
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized: no authenticated user on request'
      });
    }

    if (!requireTenant(request, reply)) {
      return;
    }

    const allowed = await checkPermission(request, permissionKey);
    if (!allowed) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden: missing required permission '${permissionKey}' in this tenant`
      });
    }
  };
}

module.exports = { authorize };
