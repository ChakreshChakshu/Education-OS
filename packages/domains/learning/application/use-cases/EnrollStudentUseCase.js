const { Result } = require('../../core');
const { Enrollment } = require('../../domain');

class EnrollStudentUseCase {
  constructor({ enrollmentRepository, userRepository, roleAssignmentRepository, passwordHasher, tokenService } = {}) {
    this.enrollmentRepository = enrollmentRepository;
    this.userRepository = userRepository;
    this.roleAssignmentRepository = roleAssignmentRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async execute(request) {
    const { tenantId, studentUserId, studentEmail, studentName, courseId, batchId, temporaryPassword } = request;

    if (!tenantId) {
      return Result.fail('Tenant ID is required.');
    }
    if (!courseId) {
      return Result.fail('Course ID is required.');
    }

    let resolvedStudentId = studentUserId;
    let rawTemporaryPassword = temporaryPassword || null;
    let resolvedEmail = studentEmail || null;

    // If studentUserId is not provided or not valid UUID, but studentEmail is given, find or create student user
    if ((!resolvedStudentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedStudentId)) && studentEmail && this.userRepository) {
      const existingUser = await this.userRepository.findByEmail(studentEmail);
      if (existingUser) {
        resolvedStudentId = existingUser.id;
        resolvedEmail = existingUser.email?.value || existingUser.email;
      } else if (typeof this.userRepository.createStudentUser === 'function') {
        if (!rawTemporaryPassword) {
          rawTemporaryPassword = `Learn@${Math.floor(1000 + Math.random() * 9000)}`;
        }
        let passwordHash = null;
        if (this.passwordHasher) {
          passwordHash = await this.passwordHasher.hash(rawTemporaryPassword);
        }
        const newUser = await this.userRepository.createStudentUser({
          email: studentEmail,
          name: studentName || studentEmail.split('@')[0],
          passwordHash,
          tenantId
        });
        resolvedStudentId = newUser.id;
        resolvedEmail = newUser.email;
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
    if (this.tokenService && typeof this.tokenService.generateToken === 'function') {
      activationToken = this.tokenService.generateToken(
        {
          userId: resolvedStudentId,
          tenantId,
          email: resolvedEmail || studentEmail,
          type: 'student_activation'
        },
        { expiresIn: '7d' }
      );
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
      saved.temporaryPassword = rawTemporaryPassword;
      saved.activationToken = activationToken;
      saved.activationUrl = activationToken ? `/activate?token=${activationToken}` : null;
      saved.student = {
        id: resolvedStudentId,
        email: resolvedEmail || studentEmail,
        name: studentName
      };
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
    saved.temporaryPassword = rawTemporaryPassword;
    saved.activationToken = activationToken;
    saved.activationUrl = activationToken ? `/activate?token=${activationToken}` : null;
    saved.student = {
      id: resolvedStudentId,
      email: resolvedEmail || studentEmail,
      name: studentName
    };
    return Result.ok(saved);
  }
}

module.exports = { EnrollStudentUseCase };
