const { Result } = require('../../core');
const { QuizSubmission } = require('../../domain/entities/QuizSubmission');
const { gradeQuiz } = require('../quiz');

class SubmitQuizUseCase {
  constructor({ quizSubmissionRepository, lessonModuleRepository, markLessonCompleteUseCase }) {
    this.quizSubmissionRepository = quizSubmissionRepository;
    this.lessonModuleRepository = lessonModuleRepository;
    this.markLessonCompleteUseCase = markLessonCompleteUseCase;
  }

  async execute({ studentUserId, lessonModuleId, answers, batchId }) {
    const module = await this.lessonModuleRepository.findById(lessonModuleId);
    if (module?.contentType !== 'QUIZ') {
      return Result.fail('Target quiz lesson not found.');
    }

    const grade = gradeQuiz(module.quiz, answers);
    if (grade.error) return Result.fail(grade.error);

    const submissionResult = QuizSubmission.create({
      studentUserId,
      lessonModuleId,
      score: grade.score,
      passingScore: grade.passingScore
    });
    if (submissionResult.isFailure) return submissionResult;

    const submission = submissionResult.getValue();
    await this.quizSubmissionRepository.save(submission);

    if (submission.passed) {
      const result = await this.markLessonCompleteUseCase.execute({
        studentUserId, lessonModuleId, batchId, quizSubmission: submission
      });
      if (result.isFailure) return result;
    }

    return Result.ok({
      id: submission.id,
      studentUserId: submission.studentUserId,
      lessonModuleId: submission.lessonModuleId,
      score: submission.score.value,
      passed: submission.passed,
      passingScore: grade.passingScore,
      totalPointsAvailable: grade.totalPointsAvailable,
      totalPointsEarned: grade.totalPointsEarned
    });
  }
}

module.exports = { SubmitQuizUseCase };
