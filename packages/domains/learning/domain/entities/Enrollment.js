const { AggregateRoot, Result } = require('../../core');
const crypto = require('crypto');

class Enrollment extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      tenantId: props.tenantId,
      studentUserId: props.studentUserId,
      courseId: props.courseId,
      batchId: props.batchId || null,
      status: props.status || 'ACTIVE',
      progressPercentage: typeof props.progressPercentage === 'number' ? props.progressPercentage : 0,
      enrolledAt: props.enrolledAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get tenantId() {
    return this.props.tenantId;
  }

  get studentUserId() {
    return this.props.studentUserId;
  }

  get courseId() {
    return this.props.courseId;
  }

  get batchId() {
    return this.props.batchId;
  }

  get status() {
    return this.props.status;
  }

  get progressPercentage() {
    return this.props.progressPercentage;
  }

  get enrolledAt() {
    return this.props.enrolledAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  updateProgress(percentage) {
    const valid = Math.max(0, Math.min(100, Math.round(percentage)));
    this.props.progressPercentage = valid;
    if (valid === 100 && this.props.status === 'ACTIVE') {
      this.props.status = 'COMPLETED';
    }
    this.props.updatedAt = new Date();
  }

  assignBatch(batchId) {
    this.props.batchId = batchId || null;
    this.props.updatedAt = new Date();
  }

  complete() {
    this.props.status = 'COMPLETED';
    this.props.progressPercentage = 100;
    this.props.updatedAt = new Date();
  }

  drop() {
    this.props.status = 'DROPPED';
    this.props.updatedAt = new Date();
  }

  reactivate() {
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
  }

  static create(props, id) {
    if (!props.tenantId) {
      return Result.fail('Tenant ID is required for enrollment.');
    }
    if (!props.studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!props.courseId) {
      return Result.fail('Course ID is required.');
    }

    const validStatuses = ['ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED'];
    if (props.status && !validStatuses.includes(props.status)) {
      return Result.fail(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
    }

    const enrollment = new Enrollment(props, id);
    return Result.ok(enrollment);
  }
}

module.exports = { Enrollment };
