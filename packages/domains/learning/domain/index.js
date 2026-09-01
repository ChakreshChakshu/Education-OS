const { Score } = require('./value-objects/Score');
const { LessonModule } = require('./entities/LessonModule');
const { StudentProgress } = require('./entities/StudentProgress');
const { QuizSubmission } = require('./entities/QuizSubmission');
const { ILessonModuleRepository } = require('./repositories/ILessonModuleRepository');
const { IStudentProgressRepository } = require('./repositories/IStudentProgressRepository');

module.exports = {
  Score,
  LessonModule,
  StudentProgress,
  QuizSubmission,
  ILessonModuleRepository,
  IStudentProgressRepository
};
