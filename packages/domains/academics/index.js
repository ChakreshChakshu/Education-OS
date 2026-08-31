/**
 * @eos/domain-academics
 * Academic Architecture & Curriculum Bounded Context
 * Governs Courses, Course Versions, Categories, Curriculum Modules, and Lessons.
 */

module.exports = {
  domain: require('./domain'),
  application: require('./application'),
  infrastructure: require('./infrastructure'),
  presentation: require('./presentation')
};
