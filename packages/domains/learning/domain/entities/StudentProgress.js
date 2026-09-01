const { AggregateRoot, Result } = require('../../core');
const crypto = require('crypto');

class StudentProgress extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      studentUserId: props.studentUserId,
      batchId: props.batchId,
      lessonModuleId: props.lessonModuleId,
      status: props.status || 'COMPLETED',
      completedAt: props.completedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get studentUserId() {
    return this.props.studentUserId;
  }

  get batchId() {
    return this.props.batchId;
  }

  get lessonModuleId() {
    return this.props.lessonModuleId;
  }

  get status() {
    return this.props.status;
  }

  get completedAt() {
    return this.props.completedAt;
  }

  static create(props, id) {
    if (!props.studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!props.lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }

    const progress = new StudentProgress(
      {
        studentUserId: props.studentUserId,
        batchId: props.batchId || null,
        lessonModuleId: props.lessonModuleId,
        status: props.status || 'COMPLETED',
        completedAt: props.completedAt || new Date(),
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(progress);
  }
}

module.exports = { StudentProgress };
