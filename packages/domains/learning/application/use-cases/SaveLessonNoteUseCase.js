const { Result } = require('../../core');
const { LessonNote } = require('../../domain/entities/LessonNote');

class SaveLessonNoteUseCase {
  constructor({ lessonNoteRepository, lessonModuleRepository }) {
    this.lessonNoteRepository = lessonNoteRepository;
    this.lessonModuleRepository = lessonModuleRepository;
  }

  async execute(dto) {
    const { studentUserId, lessonModuleId, content } = dto;

    if (!studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }

    const existingNote = await this.lessonNoteRepository.findByStudentAndLesson(
      studentUserId,
      lessonModuleId
    );

    if (existingNote) {
      existingNote.updateContent(content !== undefined ? content : '');
      await this.lessonNoteRepository.save(existingNote);
      return Result.ok({
        id: existingNote.id,
        studentUserId: existingNote.studentUserId,
        lessonModuleId: existingNote.lessonModuleId,
        content: existingNote.content,
        version: existingNote.version,
        updatedAt: existingNote.updatedAt
      });
    }

    const noteResult = LessonNote.create({
      studentUserId,
      lessonModuleId,
      content: content || ''
    });

    if (noteResult.isFailure) {
      return Result.fail(noteResult.error);
    }

    const note = noteResult.getValue();
    await this.lessonNoteRepository.save(note);

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

module.exports = { SaveLessonNoteUseCase };
