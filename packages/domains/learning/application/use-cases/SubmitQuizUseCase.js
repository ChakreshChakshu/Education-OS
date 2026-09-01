const { Result } = require('../../core');
const { QuizSubmission } = require('../../domain/entities/QuizSubmission');
const { Score } = require('../../domain/value-objects/Score');

class SubmitQuizUseCase {
  constructor({ quizSubmissionRepository, lessonModuleRepository }) {
    this.quizSubmissionRepository = quizSubmissionRepository;
    this.lessonModuleRepository = lessonModuleRepository;
  }

  async execute(dto) {
    const { studentUserId, lessonModuleId, score, passingScore } = dto;

    const module = await this.lessonModuleRepository.findById(lessonModuleId);
    if (!module) {
      return Result.fail('Target lesson module for quiz not found.');
    }

    const scoreVoResult = Score.create(score);
    if (scoreVoResult.isFailure) {
      return Result.fail(scoreVoResult.error);
    }

    const submissionResult = QuizSubmission.create({
      studentUserId,
      lessonModuleId,
      score: scoreVoResult.getValue(),
      passingScore: passingScore || 70
    });

    if (submissionResult.isFailure) {
      return Result.fail(submissionResult.error);
    }

    const submission = submissionResult.getValue();
    if (this.quizSubmissionRepository && this.quizSubmissionRepository.save) {
      await this.quizSubmissionRepository.save(submission);
    }

    return Result.ok({
      id: submission.id,
      studentUserId: submission.studentUserId,
      lessonModuleId: submission.lessonModuleId,
      score: submission.score.value,
      passed: submission.passed
    });
  }
}

module.exports = { SubmitQuizUseCase };
