const { Result } = require('../../core');
const { Course } = require('../../domain/entities/Course');
const { CourseCode } = require('../../domain/value-objects/CourseCode');

class CreateCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute(dto) {
    const { tenantId, organizationId, title, code, description, credits } = dto;

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
      description,
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
      credits: course.credits,
      status: course.status
    });
  }
}

module.exports = { CreateCourseUseCase };
