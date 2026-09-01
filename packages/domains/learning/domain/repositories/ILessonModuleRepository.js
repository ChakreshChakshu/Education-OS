class ILessonModuleRepository {
  async findById(id) {
    throw new Error('ILessonModuleRepository.findById() not implemented');
  }

  async findByCourseId(courseId) {
    throw new Error('ILessonModuleRepository.findByCourseId() not implemented');
  }

  async save(module) {
    throw new Error('ILessonModuleRepository.save() not implemented');
  }
}

module.exports = { ILessonModuleRepository };
