const { AggregateRoot, Result } = require('../../core');
const crypto = require('crypto');

class LessonNote extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      studentUserId: props.studentUserId,
      lessonModuleId: props.lessonModuleId,
      content: props.content !== undefined ? props.content : '',
      version: props.version || 1,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get studentUserId() {
    return this.props.studentUserId;
  }

  get lessonModuleId() {
    return this.props.lessonModuleId;
  }

  get content() {
    return this.props.content;
  }

  get version() {
    return this.props.version;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  updateContent(newContent) {
    this.props.content = newContent;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  static create(props, id) {
    if (!props.studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!props.lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }

    const note = new LessonNote(
      {
        studentUserId: props.studentUserId,
        lessonModuleId: props.lessonModuleId,
        content: props.content || '',
        version: props.version || 1,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(note);
  }
}

module.exports = { LessonNote };
