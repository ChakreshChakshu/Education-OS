const { AggregateRoot, Result } = require('../../core');
const { CourseCode } = require('../value-objects/CourseCode');
const crypto = require('crypto');

class Course extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      tenantId: props.tenantId,
      organizationId: props.organizationId || null,
      title: props.title,
      code: props.code,
      description: props.description || '',
      credits: props.credits || 3,
      status: props.status || 'DRAFT',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get tenantId() {
    return this.props.tenantId;
  }

  get organizationId() {
    return this.props.organizationId;
  }

  get title() {
    return this.props.title;
  }

  get code() {
    return this.props.code;
  }

  get description() {
    return this.props.description;
  }

  get credits() {
    return this.props.credits;
  }

  get status() {
    return this.props.status;
  }

  publish() {
    if (this.props.status === 'PUBLISHED') {
      return Result.fail('Course is already published.');
    }
    this.props.status = 'PUBLISHED';
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  archive() {
    this.props.status = 'ARCHIVED';
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  static create(props, id) {
    if (!props.tenantId) {
      return Result.fail('Course must belong to a valid tenant.');
    }
    if (!props.title || props.title.trim().length === 0) {
      return Result.fail('Course title is required.');
    }

    let codeVo = props.code;
    if (typeof props.code === 'string') {
      const codeRes = CourseCode.create(props.code);
      if (codeRes.isFailure) return Result.fail(codeRes.error);
      codeVo = codeRes.getValue();
    }

    const course = new Course(
      {
        tenantId: props.tenantId,
        organizationId: props.organizationId || null,
        title: props.title.trim(),
        code: codeVo,
        description: props.description || '',
        credits: props.credits || 3,
        status: props.status || 'DRAFT',
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(course);
  }
}

module.exports = { Course };
