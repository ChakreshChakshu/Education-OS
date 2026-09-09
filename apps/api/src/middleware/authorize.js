// Scoped RBAC authorization (docs/auth_and_authorization.md §5-8).
// Resolves permissions dynamically from role_assignments at request time —
// deliberately not trusting any role/permission claim baked into the JWT.
function authorize(permissionKey) {
  return async function authorizeHandler(request, reply) {
    const tenantId = request.headers['x-tenant-id'];
    const userId = request.user && (request.user.userId || request.user.sub);

    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Unauthorized: no authenticated user on request' });
    }
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Missing required x-tenant-id header' });
    }

    const roleAssignmentRepository = request.container.resolve('RoleAssignmentRepository');
    const organizationId = request.headers['x-organization-id'] || null;

    const allowed = await roleAssignmentRepository.hasPermission({
      userId,
      tenantId,
      organizationId,
      permissionKey
    });

    if (!allowed) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden: missing required permission '${permissionKey}' in this tenant`
      });
    }
  };
}

module.exports = { authorize };
