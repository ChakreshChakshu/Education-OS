const { randomBytes } = require('node:crypto');
const { STUDENT_ACTIVATION_TYPE, activationPasswordHash } = require('../studentActivation');
const { Result } = require('../../core');
const { Enrollment } = require('../../domain');

class EnrollStudentUseCase {
  constructor({ enrollmentRepository, userRepository, roleAssignmentRepository, tokenService } = {}) {
    this.enrollmentRepository = enrollmentRepository;
    this.userRepository = userRepository;
    this.roleAssignmentRepository = roleAssignmentRepository;
    this.tokenService = tokenService;
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
    let activationNonce = null;
    let resolvedEmail = null;

    if (studentUserId && studentEmail && this.userRepository) {
      const user = await this.userRepository.findById(studentUserId);
      resolvedEmail = user?.email?.value || user?.email || null;
    } else if (studentEmail && this.userRepository) {
      const existingUser = await this.userRepository.findByEmail(studentEmail);
      if (existingUser) {
        resolvedStudentId = existingUser.id;
        resolvedEmail = existingUser.email?.value || existingUser.email;
      } else if (typeof this.tokenService?.generateToken === 'function' && typeof this.userRepository.createStudentUser === 'function') {
        const nonce = randomBytes(32).toString('hex');
        const newUser = await this.userRepository.createStudentUser({
          email: studentEmail,
          name: studentName || studentEmail.split('@')[0],
          passwordHash: activationPasswordHash(nonce)
        });
        if (newUser) {
          activationNonce = nonce;
          resolvedStudentId = newUser.id;
          resolvedEmail = newUser.email;
        } else {
          const concurrentUser = await this.userRepository.findByEmail(studentEmail);
          resolvedStudentId = concurrentUser?.id;
          resolvedEmail = concurrentUser?.email?.value || concurrentUser?.email;
        }
      }
    }

    if (!resolvedStudentId) {
      return Result.fail('Student identifier or valid email is required.');
    }

    // Auto-assign STUDENT role to user for this tenant if roleAssignmentRepository provided
    if (this.roleAssignmentRepository && typeof this.roleAssignmentRepository.assignRole === 'function') {
      try {
        await this.roleAssignmentRepository.assignRole({
          userId: resolvedStudentId,
          tenantId,
          roleName: 'STUDENT'
        });
      } catch (err) {
        // Non-fatal if role assignment already exists or fails soft
      }
    }

    // Generate activation token if tokenService provided
    let activationToken = null;
    if (activationNonce) {
      activationToken = this.tokenService.generateToken(
        {
          userId: resolvedStudentId,
          tenantId,
          email: resolvedEmail,
          type: STUDENT_ACTIVATION_TYPE,
          nonce: activationNonce
        },
        { expiresIn: '7d' }
      );
    }

    // Check for existing active enrollment in this course
    const existing = await this.enrollmentRepository.findByStudentAndCourse(resolvedStudentId, courseId);
    if (existing && existing.status === 'ACTIVE') {
      return Result.fail('Student is already actively enrolled in this course.');
    }

    let enrollment;
    if (existing) {
      existing.reactivate();
      if (batchId) existing.assignBatch(batchId);
      enrollment = existing;
    } else {
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
      enrollment = enrollmentResult.getValue();
    }

    const saved = await this.enrollmentRepository.save(enrollment);
    saved.activationToken = activationToken;
    saved.student = { id: resolvedStudentId, email: resolvedEmail, name: studentName };
    return Result.ok(saved);
  }
}

module.exports = { EnrollStudentUseCase };
