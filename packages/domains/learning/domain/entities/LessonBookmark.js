const { AggregateRoot, Result } = require('../../core');
const crypto = require('crypto');

class LessonBookmark extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      studentUserId: props.studentUserId,
      lessonModuleId: props.lessonModuleId,
      timestampSeconds: typeof props.timestampSeconds === 'number' ? props.timestampSeconds : 0,
      title: props.title || 'Bookmark',
      note: props.note || null,
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

  get timestampSeconds() {
    return this.props.timestampSeconds;
  }

  get title() {
    return this.props.title;
  }

  get note() {
    return this.props.note;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  static create(props, id) {
    if (!props.studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!props.lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }
    if (props.timestampSeconds === undefined || props.timestampSeconds === null || props.timestampSeconds < 0) {
      return Result.fail('Valid non-negative timestampSeconds is required.');
    }
    if (!props.title || props.title.trim().length === 0) {
      return Result.fail('Bookmark title is required.');
    }

    const bookmark = new LessonBookmark(
      {
        studentUserId: props.studentUserId,
        lessonModuleId: props.lessonModuleId,
        timestampSeconds: Math.floor(props.timestampSeconds),
        title: props.title.trim(),
        note: props.note ? props.note.trim() : null,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      },
      id
    );

    return Result.ok(bookmark);
  }
}

module.exports = { LessonBookmark };
