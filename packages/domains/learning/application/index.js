const { MarkLessonCompleteUseCase } = require('./use-cases/MarkLessonCompleteUseCase');
const { SubmitQuizUseCase } = require('./use-cases/SubmitQuizUseCase');
const { SaveLessonNoteUseCase } = require('./use-cases/SaveLessonNoteUseCase');
const { GetLessonNoteUseCase } = require('./use-cases/GetLessonNoteUseCase');

module.exports = {
  MarkLessonCompleteUseCase,
  SubmitQuizUseCase,
  SaveLessonNoteUseCase,
  GetLessonNoteUseCase
};
