let domainAcademics;

try {
  domainAcademics = require('@eos/domain-academics');
} catch (e) {
  domainAcademics = require('../../../domains/academics');
}

module.exports = {
  Course: domainAcademics.domain.Course,
  Batch: domainAcademics.domain.Batch,
  Subject: domainAcademics.domain.Subject,
  CourseCode: domainAcademics.domain.CourseCode,
  AcademicTerm: domainAcademics.domain.AcademicTerm
};
