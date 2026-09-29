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
  LessonBookmark: domainLearning.domain.LessonBookmark,
  Enrollment: domainLearning.domain.Enrollment,
  Score: domainLearning.domain.Score
};

