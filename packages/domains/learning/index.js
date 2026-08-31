/**
 * @eos/domain-learning
 * Learning Engine & Assessments Bounded Context
 * Governs Course Offerings, Enrollments, Progress, Assessments, Quizzes, and Certificates.
 */

module.exports = {
  domain: require('./domain'),
  application: require('./application'),
  infrastructure: require('./infrastructure'),
  presentation: require('./presentation')
};
