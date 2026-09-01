const { AggregateRoot, Result } = require('../../core');
const { Score } = require('../value-objects/Score');
const crypto = require('crypto');

class QuizSubmission extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      studentUserId: props.studentUserId,
      lessonModuleId: props.lessonModuleId,
      score: props.score,
      passed: props.passed || false,
      submittedAt: props.submittedAt || new Date(),
      createdAt: props.createdAt || new Date()
    };
  }

  get studentUserId() {
    return this.props.studentUserId;
  }

  get lessonModuleId() {
    return this.props.lessonModuleId;
  }

  get score() {
    return this.props.score;
  }

  get passed() {
    return this.props.passed;
  }

  static create(props, id) {
    if (!props.studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!props.lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }

    let scoreVo = props.score;
    if (typeof props.score === 'number') {
      const scoreRes = Score.create(props.score);
      if (scoreRes.isFailure) return Result.fail(scoreRes.error);
      scoreVo = scoreRes.getValue();
    }

    const passingScore = props.passingScore || 70;
    const isPassed = scoreVo ? scoreVo.value >= passingScore : false;

    const submission = new QuizSubmission(
      {
        studentUserId: props.studentUserId,
        lessonModuleId: props.lessonModuleId,
        score: scoreVo,
        passed: isPassed,
        submittedAt: props.submittedAt || new Date(),
        createdAt: props.createdAt || new Date()
      },
      id
    );

    return Result.ok(submission);
  }
}

module.exports = { QuizSubmission };
