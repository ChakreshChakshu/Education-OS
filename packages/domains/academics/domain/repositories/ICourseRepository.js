class ICourseRepository {
  async findById(id) {
    throw new Error('ICourseRepository.findById() not implemented');
  }

  async findByCode(tenantId, codeStr) {
    throw new Error('ICourseRepository.findByCode() not implemented');
  }

  async save(course) {
    throw new Error('ICourseRepository.save() not implemented');
  }
}

module.exports = { ICourseRepository };
