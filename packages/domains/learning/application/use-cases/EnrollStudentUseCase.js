const { Result } = require('../../core');
const { Enrollment } = require('../../domain');

class EnrollStudentUseCase {
  constructor({ enrollmentRepository, userRepository }) {
    this.enrollmentRepository = enrollmentRepository;
    this.userRepository = userRepository;
  }

  async execute(request) {
    const { tenantId, studentUserId, studentEmail, studentName, courseId, batchId } = request;

    if (!tenantId) {
      return Result.fail('Tenant ID is required.');
    }
    if (!courseId) {
      return Result.fail('Course ID is required.');
    }

    let resolvedStudentId = studentUserId;

    // If studentUserId is not provided or not valid UUID, but studentEmail is given, find or create student user
    if ((!resolvedStudentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedStudentId)) && studentEmail && this.userRepository) {
      const existingUser = await this.userRepository.findByEmail(studentEmail);
      if (existingUser) {
        resolvedStudentId = existingUser.id;
      } else if (typeof this.userRepository.createStudentUser === 'function') {
        const newUser = await this.userRepository.createStudentUser({
          email: studentEmail,
          name: studentName || studentEmail.split('@')[0],
          tenantId
        });
        resolvedStudentId = newUser.id;
      }
    }

    if (!resolvedStudentId) {
      return Result.fail('Student identifier or valid email is required.');
    }

    // Check for existing active enrollment in this course
    const existing = await this.enrollmentRepository.findByStudentAndCourse(resolvedStudentId, courseId);
    if (existing && existing.status === 'ACTIVE') {
      return Result.fail('Student is already actively enrolled in this course.');
    }

    // If existing enrollment was dropped or completed, reactivate or update batch
    if (existing) {
      existing.reactivate();
      if (batchId) existing.assignBatch(batchId);
      const saved = await this.enrollmentRepository.save(existing);
      return Result.ok(saved);
    }

    const enrollmentResult = Enrollment.create({
      tenantId,
      studentUserId: resolvedStudentId,
      courseId,
      batchId: batchId || null,
      status: 'ACTIVE',
      progressPercentage: 0
    });

    if (enrollmentResult.isFailure) {
      return Result.fail(enrollmentResult.error);
    }

    const saved = await this.enrollmentRepository.save(enrollmentResult.getValue());
    return Result.ok(saved);
  }
}

module.exports = { EnrollStudentUseCase };
