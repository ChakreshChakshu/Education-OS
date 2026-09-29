const { Result } = require('../../core');

class GetLessonBookmarksUseCase {
  constructor({ lessonBookmarkRepository }) {
    this.lessonBookmarkRepository = lessonBookmarkRepository;
  }

  async execute({ studentUserId, lessonModuleId }) {
    if (!studentUserId) {
      return Result.fail('Student user ID is required.');
    }
    if (!lessonModuleId) {
      return Result.fail('Lesson module ID is required.');
    }

    const bookmarks = await this.lessonBookmarkRepository.findByLessonAndStudent(
      lessonModuleId,
      studentUserId
    );

    const data = (bookmarks || []).map((b) => ({
      id: b.id,
      studentUserId: b.studentUserId,
      lessonModuleId: b.lessonModuleId,
      timestampSeconds: b.timestampSeconds,
      title: b.title,
      note: b.note,
      createdAt: b.createdAt
    }));

    return Result.ok(data);
  }
}

module.exports = { GetLessonBookmarksUseCase };
