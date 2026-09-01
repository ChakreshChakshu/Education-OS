const { AggregateRoot, Result } = require('../../core');
const { AcademicTerm } = require('../value-objects/AcademicTerm');
const crypto = require('crypto');

class Batch extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      courseId: props.courseId,
      name: props.name,
      term: props.term || null,
      capacity: props.capacity || 50,
      instructorUserId: props.instructorUserId || null,
      startDate: props.startDate || new Date(),
      endDate: props.endDate || null,
      status: props.status || 'ACTIVE',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get courseId() {
    return this.props.courseId;
  }

  get name() {
    return this.props.name;
  }

  get term() {
    return this.props.term;
  }

  get capacity() {
    return this.props.capacity;
  }

  get instructorUserId() {
    return this.props.instructorUserId;
  }

  get status() {
    return this.props.status;
  }

  assignInstructor(instructorUserId) {
    if (!instructorUserId) {
      return Result.fail('Valid instructor user ID is required.');
    }
    this.props.instructorUserId = instructorUserId;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  static create(props, id) {
    if (!props.courseId) {
      return Result.fail('Batch must be associated with a valid course.');
    }
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Batch name is required (e.g. 2026-Fall-Section-A).');
    }

    let termVo = props.term;
    if (typeof props.term === 'string') {
      const termRes = AcademicTerm.create(props.term);
      if (termRes.isFailure) return Result.fail(termRes.error);
      termVo = termRes.getValue();
    }

    const batch = new Batch(
      {
        courseId: props.courseId,
        name: props.name.trim(),
        term: termVo || null,
        capacity: props.capacity || 50,
        instructorUserId: props.instructorUserId || null,
        startDate: props.startDate || new Date(),
        endDate: props.endDate || null,
        status: props.status || 'ACTIVE',
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(batch);
  }
}

module.exports = { Batch };
