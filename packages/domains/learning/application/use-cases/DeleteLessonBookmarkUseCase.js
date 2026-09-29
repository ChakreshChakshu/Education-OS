const { Result } = require('../../core');

class DeleteLessonBookmarkUseCase {
  constructor({ lessonBookmarkRepository }) {
    this.lessonBookmarkRepository = lessonBookmarkRepository;
  }

  async execute({ bookmarkId, studentUserId }) {
    if (!bookmarkId) {
      return Result.fail('Bookmark ID is required.');
    }
    if (!studentUserId) {
      return Result.fail('Student user ID is required.');
    }

    await this.lessonBookmarkRepository.delete(bookmarkId, studentUserId);
    return Result.ok({ id: bookmarkId });
  }
}

module.exports = { DeleteLessonBookmarkUseCase };
