const { Result } = require('../../core');
const { QuizSubmission } = require('../../domain/entities/QuizSubmission');
const { StudentProgress } = require('../../domain/entities/StudentProgress');

class MarkLessonCompleteUseCase {
  constructor({ studentProgressRepository, lessonModuleRepository }) {
    this.studentProgressRepository = studentProgressRepository;
    this.lessonModuleRepository = lessonModuleRepository;
  }

  async execute(dto) {
    const { studentUserId, batchId, lessonModuleId, quizSubmission } = dto;

    const module = await this.lessonModuleRepository.findById(lessonModuleId);
    if (!module) {
      return Result.fail('Lesson module not found.');
    }

    if (module.contentType === 'QUIZ' && (
      !(quizSubmission instanceof QuizSubmission) || !quizSubmission.passed ||
      quizSubmission.studentUserId !== studentUserId || quizSubmission.lessonModuleId !== lessonModuleId
    )) {
      return Result.fail('Pass the quiz to complete this lesson.');
    }

    const existingProgress = await this.studentProgressRepository.findByStudentAndModule(
      studentUserId,
      lessonModuleId
    );

    if (existingProgress?.status === 'COMPLETED') {
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
      lessonModuleId,
      createdAt: existingProgress?.props.createdAt
    }, existingProgress?.id);

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
