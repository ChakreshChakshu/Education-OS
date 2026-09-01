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
  Score: domainLearning.domain.Score
};
