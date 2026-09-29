const { Result } = require('../../core');

class UpdateEnrollmentStatusUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute(request = {}) {
    const { enrollmentId, status, batchId, progressPercentage } = request;

    if (!enrollmentId) {
      return Result.fail('Enrollment ID is required.');
    }

    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      return Result.fail('Enrollment not found.');
    }

    if (status) {
      if (status === 'COMPLETED') enrollment.complete();
      else if (status === 'DROPPED') enrollment.drop();
      else if (status === 'ACTIVE') enrollment.reactivate();
      else enrollment.props.status = status;
    }

    if (batchId !== undefined) {
      enrollment.assignBatch(batchId);
    }

    if (typeof progressPercentage === 'number') {
      enrollment.updateProgress(progressPercentage);
    }

    const saved = await this.enrollmentRepository.save(enrollment);
    return Result.ok(saved);
  }
}

module.exports = { UpdateEnrollmentStatusUseCase };
