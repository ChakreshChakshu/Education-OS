const { CourseCode } = require('./value-objects/CourseCode');
const { AcademicTerm } = require('./value-objects/AcademicTerm');
const { Course } = require('./entities/Course');
const { Batch } = require('./entities/Batch');
const { Subject } = require('./entities/Subject');
const { ICourseRepository } = require('./repositories/ICourseRepository');
const { IBatchRepository } = require('./repositories/IBatchRepository');

module.exports = {
  CourseCode,
  AcademicTerm,
  Course,
  Batch,
  Subject,
  ICourseRepository,
  IBatchRepository
};
