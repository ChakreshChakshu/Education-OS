class IStudentProgressRepository {
  async findByStudentAndModule(studentUserId, lessonModuleId) {
    throw new Error('IStudentProgressRepository.findByStudentAndModule() not implemented');
  }

  async save(progress) {
    throw new Error('IStudentProgressRepository.save() not implemented');
  }
}

module.exports = { IStudentProgressRepository };
