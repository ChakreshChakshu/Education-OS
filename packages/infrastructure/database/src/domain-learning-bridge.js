let domainLearning;

try {
  domainLearning = require('@eos/domain-learning');
} catch (e) {
  domainLearning = require('../../../domains/learning');
}

module.exports = {
  LessonModule: domainLearning.domain.LessonModule,
  StudentProgress: domainLearning.domain.StudentProgress,
  QuizSubmission: domainLearning.domain.QuizSubmission,
  LessonNote: domainLearning.domain.LessonNote,
  Score: domainLearning.domain.Score
};
