async function queueEnrollmentInvitation({ container, request, enrollment, course }) {
  const { student, activationToken } = enrollment;
  if (!student?.email) return false;

  try {
    await container.resolve('OutboxRepository').create({
      eventName: 'EnrollmentCreated',
      aggregateType: 'Enrollment',
      aggregateId: enrollment.id,
      payload: {
        enrollmentId: enrollment.id,
        tenantId: enrollment.tenantId,
        courseId: course.id,
        courseTitle: course.title,
        courseCode: course.code?.value || course.code || '',
        studentUserId: enrollment.studentUserId,
        studentEmail: student.email,
        studentName: student.name || 'Student',
        activationUrl: activationToken ? '/activate?token=' + encodeURIComponent(activationToken) : null
      }
    });
    return true;
  } catch (err) {
    request.log.warn({ err, enrollmentId: enrollment.id }, 'Failed to queue enrollment invitation');
    return false;
  }
}

function serializeEnrollment(enrollment) {
  return { id: enrollment.id, props: enrollment.props, student: enrollment.student };
}

module.exports = { queueEnrollmentInvitation, serializeEnrollment };
