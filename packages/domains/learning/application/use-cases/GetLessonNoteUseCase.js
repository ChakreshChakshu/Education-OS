const { Result } = require('../../core');

class GetLessonNoteUseCase {
  constructor({ lessonNoteRepository }) {
    this.lessonNoteRepository = lessonNoteRepository;
  }

  async execute(dto) {
    const { studentUserId, lessonModuleId } = dto;

    if (!studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }

    const note = await this.lessonNoteRepository.findByStudentAndLesson(
      studentUserId,
      lessonModuleId
    );

    if (!note) {
      return Result.ok({
        studentUserId,
        lessonModuleId,
        content: '',
        version: 0,
        updatedAt: null
      });
    }

    return Result.ok({
      id: note.id,
      studentUserId: note.studentUserId,
      lessonModuleId: note.lessonModuleId,
      content: note.content,
      version: note.version,
      updatedAt: note.updatedAt
    });
  }
}

module.exports = { GetLessonNoteUseCase };
