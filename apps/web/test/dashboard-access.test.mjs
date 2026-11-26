import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessDashboardPath, getDashboardAccess, loadDashboardOverview } from '../lib/dashboard-access.js';

const admin = { id: 'admin-workspace', role: 'ADMIN' };
const instructor = { id: 'instructor-workspace', role: 'INSTRUCTOR' };
const student = { id: 'student-workspace', role: 'STUDENT' };

test('workspace roles control direct dashboard access and override admin view preferences', () => {
  const adminAccess = getDashboardAccess(admin, 'ADMIN');
  const instructorAccess = getDashboardAccess(instructor, 'ADMIN');
  const studentAccess = getDashboardAccess(student, 'ADMIN');
  assert.equal(studentAccess.portalMode, 'STUDENT');
  assert.equal(getDashboardAccess(null, 'ADMIN').portalMode, 'STUDENT');

  assert.equal(canAccessDashboardPath('/dashboard/tenants', adminAccess), true);
  assert.equal(canAccessDashboardPath('/dashboard/tenants', instructorAccess), false);
  assert.equal(canAccessDashboardPath('/dashboard/students', instructorAccess), true);
  for (const path of ['/dashboard/tenants', '/dashboard/students', '/dashboard/courses/course/']) {
    assert.equal(canAccessDashboardPath(path, studentAccess), false, path);
  }
  for (const path of ['/dashboard', '/dashboard/courses', '/dashboard/settings',
    '/dashboard/courses/course/learn', '/dashboard/courses/course/lesson/one']) {
    assert.equal(canAccessDashboardPath(path, studentAccess), true, path);
  }

  assert.equal(getDashboardAccess({ ...admin, organizationId: 'branch-id' }, 'ADMIN').canManageTenant, false);
  assert.equal(getDashboardAccess(admin, 'STUDENT').portalMode, 'STUDENT');
});

test('switching from an admin workspace to a student workspace loads only personal enrollment data', async () => {
  const requests = [];
  const api = {
    getCourses: async (filters) => requests.push(['courses', filters]),
    getEnrollments: async (filters) => requests.push(['enrollments', filters]),
    getBatches: async (courseId, filters) => requests.push(['batches', filters])
  };
  const userId = 'signed-in-user';
  await loadDashboardOverview(api, {
    portalMode: getDashboardAccess(admin, 'ADMIN').portalMode,
    tenantId: admin.id,
    studentId: userId
  });
  await loadDashboardOverview(api, {
    portalMode: getDashboardAccess(student, 'ADMIN').portalMode,
    tenantId: student.id,
    studentId: userId
  });
  await loadDashboardOverview(api, { portalMode: 'STUDENT', tenantId: student.id });
  assert.deepEqual(requests, [
    ['courses', { tenantId: admin.id }],
    ['enrollments', { tenantId: admin.id }],
    ['batches', { tenantId: admin.id }],
    ['courses', { tenantId: student.id }],
    ['enrollments', { tenantId: student.id, studentUserId: userId }]
  ]);
});
