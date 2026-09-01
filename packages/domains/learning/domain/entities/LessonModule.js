const { AggregateRoot, Result } = require('../../core');
const crypto = require('crypto');

class LessonModule extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      courseId: props.courseId,
      title: props.title,
      contentType: props.contentType || 'VIDEO',
      contentUrl: props.contentUrl || '',
      order: props.order || 1,
      status: props.status || 'PUBLISHED',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get courseId() {
    return this.props.courseId;
  }

  get title() {
    return this.props.title;
  }

  get contentType() {
    return this.props.contentType;
  }

  get contentUrl() {
    return this.props.contentUrl;
  }

  get order() {
    return this.props.order;
  }

  get status() {
    return this.props.status;
  }

  static create(props, id) {
    if (!props.courseId) {
      return Result.fail('Lesson module must belong to a course.');
    }
    if (!props.title || props.title.trim().length === 0) {
      return Result.fail('Lesson module title is required.');
    }

    const module = new LessonModule(
      {
        courseId: props.courseId,
        title: props.title.trim(),
        contentType: props.contentType || 'VIDEO',
        contentUrl: props.contentUrl || '',
        order: props.order || 1,
        status: props.status || 'PUBLISHED',
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(module);
  }
}

module.exports = { LessonModule };
