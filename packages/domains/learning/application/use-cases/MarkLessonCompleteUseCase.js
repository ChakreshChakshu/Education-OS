const { Result } = require('../../core');
const { StudentProgress } = require('../../domain/entities/StudentProgress');

class MarkLessonCompleteUseCase {
  constructor({ studentProgressRepository, lessonModuleRepository }) {
    this.studentProgressRepository = studentProgressRepository;
    this.lessonModuleRepository = lessonModuleRepository;
  }

  async execute(dto) {
    const { studentUserId, batchId, lessonModuleId } = dto;

    const module = await this.lessonModuleRepository.findById(lessonModuleId);
    if (!module) {
      return Result.fail('Lesson module not found.');
    }

    const existingProgress = await this.studentProgressRepository.findByStudentAndModule(
      studentUserId,
      lessonModuleId
    );

    if (existingProgress) {
      return Result.ok({
        id: existingProgress.id,
        studentUserId: existingProgress.studentUserId,
        lessonModuleId: existingProgress.lessonModuleId,
        status: existingProgress.status,
        alreadyCompleted: true
      });
    }

    const progressResult = StudentProgress.create({
      studentUserId,
      batchId,
      lessonModuleId
    });

    if (progressResult.isFailure) {
      return Result.fail(progressResult.error);
    }

    const progress = progressResult.getValue();
    await this.studentProgressRepository.save(progress);

    return Result.ok({
      id: progress.id,
      studentUserId: progress.studentUserId,
      lessonModuleId: progress.lessonModuleId,
      status: progress.status,
      alreadyCompleted: false
    });
  }
}

module.exports = { MarkLessonCompleteUseCase };
