const { isDevAuthBypassEnabled } = require('../../middleware/tenantScope');

async function requireActiveEnrollment(request, reply, container, studentUserId, courseId) {
  if (isDevAuthBypassEnabled()) {
    return { batchId: request.body?.batchId };
  }

  const enrollment = await container.resolve('EnrollmentRepository').findByStudentAndCourse(studentUserId, courseId);
  if (enrollment?.status === 'ACTIVE' && enrollment.tenantId === request.tenantId) {
    return enrollment;
  }

  reply.status(403).send({ success: false, error: 'Active course enrollment required' });
  return null;
}

module.exports = { requireActiveEnrollment };
