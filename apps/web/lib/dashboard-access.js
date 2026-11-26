export function getDashboardAccess(tenant, preferredMode) {
  // Dashboard management calls are tenant-wide. An organization-scoped role
  // does not grant access to tenant-wide management.
  const role = tenant?.id && !tenant.organizationId ? tenant.role : null;
  const canManageTenant = role === 'ADMIN';
  const canManageCourses = canManageTenant || role === 'INSTRUCTOR';
  const portalMode = canManageCourses && preferredMode !== 'STUDENT' ? 'ADMIN' : 'STUDENT';
  return { canManageTenant, canManageCourses, portalMode };
}

export function canAccessDashboardPath(pathname, access) {
  const [dashboard, section, courseId, ...remaining] = (pathname || '').split('/').filter(Boolean);
  if (dashboard !== 'dashboard') return true;
  if (section === 'tenants') return access.canManageTenant;
  if (section === 'students' || (section === 'courses' && courseId && !remaining.length)) {
    return access.canManageCourses;
  }
  return true;
}

export async function loadDashboardOverview(api, { portalMode, tenantId, studentId }) {
  if (!tenantId || (portalMode !== 'ADMIN' && !studentId)) return [];

  if (portalMode === 'ADMIN') {
    return Promise.all([
      api.getCourses({ tenantId }),
      api.getEnrollments({ tenantId }),
      api.getBatches(undefined, { tenantId })
    ]);
  }

  return Promise.all([
    api.getCourses({ tenantId }),
    api.getEnrollments({ tenantId, studentUserId: studentId })
  ]);
}
