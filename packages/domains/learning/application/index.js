const { MarkLessonCompleteUseCase } = require('./use-cases/MarkLessonCompleteUseCase');
const { SubmitQuizUseCase } = require('./use-cases/SubmitQuizUseCase');
const { SaveLessonNoteUseCase } = require('./use-cases/SaveLessonNoteUseCase');
const { GetLessonNoteUseCase } = require('./use-cases/GetLessonNoteUseCase');
const { CreateLessonBookmarkUseCase } = require('./use-cases/CreateLessonBookmarkUseCase');
const { GetLessonBookmarksUseCase } = require('./use-cases/GetLessonBookmarksUseCase');
const { DeleteLessonBookmarkUseCase } = require('./use-cases/DeleteLessonBookmarkUseCase');
const { EnrollStudentUseCase } = require('./use-cases/EnrollStudentUseCase');
const { GetTenantEnrollmentsUseCase } = require('./use-cases/GetTenantEnrollmentsUseCase');
const { UpdateEnrollmentStatusUseCase } = require('./use-cases/UpdateEnrollmentStatusUseCase');

module.exports = {
  MarkLessonCompleteUseCase,
  SubmitQuizUseCase,
  SaveLessonNoteUseCase,
  GetLessonNoteUseCase,
  CreateLessonBookmarkUseCase,
  GetLessonBookmarksUseCase,
  DeleteLessonBookmarkUseCase,
  EnrollStudentUseCase,
  GetTenantEnrollmentsUseCase,
  UpdateEnrollmentStatusUseCase
};

