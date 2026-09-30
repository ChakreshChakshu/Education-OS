const { Result } = require('../../core');
const { Course } = require('../../domain/entities/Course');
const { CourseCode } = require('../../domain/value-objects/CourseCode');

class CreateCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute(dto) {
    const {
      tenantId,
      organizationId,
      title,
      code,
      slug,
      shortDescription,
      description,
      thumbnailFileId,
      level,
      language,
      visibility,
      credits
    } = dto;

    const codeVoResult = CourseCode.create(code);
    if (codeVoResult.isFailure) {
      return Result.fail(codeVoResult.error);
    }
    const codeVo = codeVoResult.getValue();

    const existingCourse = await this.courseRepository.findByCode(tenantId, codeVo.value);
    if (existingCourse) {
      return Result.fail(`Course with code '${codeVo.value}' already exists for this tenant.`);
    }

    const courseResult = Course.create({
      tenantId,
      organizationId,
      title,
      code: codeVo,
      slug,
      shortDescription,
      description,
      thumbnailFileId: thumbnailFileId || null,
      level: level || 'ALL_LEVELS',
      language: language || 'en',
      visibility: visibility || 'PUBLIC',
      credits
    });

    if (courseResult.isFailure) {
      return Result.fail(courseResult.error);
    }

    const course = courseResult.getValue();
    await this.courseRepository.save(course);

    return Result.ok({
      id: course.id,
      tenantId: course.tenantId,
      organizationId: course.organizationId,
      title: course.title,
      code: course.code.value,
      slug: course.slug,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnailFileId: course.thumbnailFileId,
      thumbnailUrl: course.thumbnailUrl,
      level: course.level,
      language: course.language,
      visibility: course.visibility,
      credits: course.credits,
      status: course.status
    });
  }
}

module.exports = { CreateCourseUseCase };
