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
      slug: props.slug || Course.slugify(props.title),
      shortDescription: props.shortDescription || '',
      description: props.description || '',
      thumbnailFileId: props.thumbnailFileId || null,
      thumbnailUrl: props.thumbnailUrl || null,
      level: props.level || 'ALL_LEVELS',
      language: props.language || 'en',
      visibility: props.visibility || 'PUBLIC',
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

  get slug() {
    return this.props.slug;
  }

  get shortDescription() {
    return this.props.shortDescription;
  }

  get description() {
    return this.props.description;
  }

  get thumbnailFileId() {
    return this.props.thumbnailFileId;
  }

  get thumbnailUrl() {
    return this.props.thumbnailUrl;
  }

  get level() {
    return this.props.level;
  }

  get language() {
    return this.props.language;
  }

  get visibility() {
    return this.props.visibility;
  }

  get credits() {
    return this.props.credits;
  }

  get status() {
    return this.props.status;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  static slugify(text) {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
    const level = props.level && validLevels.includes(props.level.toUpperCase())
      ? props.level.toUpperCase()
      : 'ALL_LEVELS';

    const validVisibilities = ['PUBLIC', 'PRIVATE', 'UNLISTED'];
    const visibility = props.visibility && validVisibilities.includes(props.visibility.toUpperCase())
      ? props.visibility.toUpperCase()
      : 'PUBLIC';

    const course = new Course(
      {
        tenantId: props.tenantId,
        organizationId: props.organizationId || null,
        title: props.title.trim(),
        code: codeVo,
        slug: props.slug ? Course.slugify(props.slug) : Course.slugify(props.title),
        shortDescription: props.shortDescription || '',
        description: props.description || '',
        thumbnailFileId: props.thumbnailFileId || null,
        thumbnailUrl: props.thumbnailUrl || null,
        level,
        language: props.language || 'en',
        visibility,
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
