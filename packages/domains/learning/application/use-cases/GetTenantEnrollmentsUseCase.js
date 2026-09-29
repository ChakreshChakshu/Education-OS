const { Result } = require('../../core');

class GetTenantEnrollmentsUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute(request = {}) {
    const { tenantId, courseId, batchId, status, search } = request;

    if (!tenantId) {
      return Result.fail('Tenant ID is required.');
    }

    const enrollments = await this.enrollmentRepository.findByTenant({
      tenantId,
      courseId,
      batchId,
      status,
      search
    });

    return Result.ok(enrollments);
  }
}

module.exports = { GetTenantEnrollmentsUseCase };
