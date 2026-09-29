const { Result } = require('../../core');
const { LessonBookmark } = require('../../domain/entities/LessonBookmark');

class CreateLessonBookmarkUseCase {
  constructor({ lessonBookmarkRepository }) {
    this.lessonBookmarkRepository = lessonBookmarkRepository;
  }

  async execute({ studentUserId, lessonModuleId, timestampSeconds, title, note }) {
    if (!studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }
    if (timestampSeconds === undefined || timestampSeconds === null || timestampSeconds < 0) {
      return Result.fail('Valid non-negative timestampSeconds is required.');
    }

    const bookmarkResult = LessonBookmark.create({
      studentUserId,
      lessonModuleId,
      timestampSeconds,
      title: title || `Bookmark @ ${Math.floor(timestampSeconds / 60)}:${(Math.floor(timestampSeconds) % 60).toString().padStart(2, '0')}`,
      note
    });

    if (bookmarkResult.isFailure) {
      return Result.fail(bookmarkResult.error);
    }

    const bookmark = bookmarkResult.getValue();
    await this.lessonBookmarkRepository.save(bookmark);

    return Result.ok({
      id: bookmark.id,
      studentUserId: bookmark.studentUserId,
      lessonModuleId: bookmark.lessonModuleId,
      timestampSeconds: bookmark.timestampSeconds,
      title: bookmark.title,
      note: bookmark.note,
      createdAt: bookmark.createdAt
    });
  }
}

module.exports = { CreateLessonBookmarkUseCase };
