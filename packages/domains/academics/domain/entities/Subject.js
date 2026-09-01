const { Entity, Result } = require('../../core');
const crypto = require('crypto');

class Subject extends Entity {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      courseId: props.courseId,
      title: props.title,
      order: props.order || 1,
      description: props.description || ''
    };
  }

  get courseId() {
    return this.props.courseId;
  }

  get title() {
    return this.props.title;
  }

  get order() {
    return this.props.order;
  }

  static create(props, id) {
    if (!props.courseId) {
      return Result.fail('Subject must be linked to a course.');
    }
    if (!props.title || props.title.trim().length === 0) {
      return Result.fail('Subject title is required.');
    }

    const subject = new Subject(
      {
        courseId: props.courseId,
        title: props.title.trim(),
        order: props.order || 1,
        description: props.description || ''
      },
      id
    );

    return Result.ok(subject);
  }
}

module.exports = { Subject };
