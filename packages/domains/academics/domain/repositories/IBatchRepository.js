class IBatchRepository {
  async findById(id) {
    throw new Error('IBatchRepository.findById() not implemented');
  }

  async findByCourseId(courseId) {
    throw new Error('IBatchRepository.findByCourseId() not implemented');
  }

  async save(batch) {
    throw new Error('IBatchRepository.save() not implemented');
  }
}

module.exports = { IBatchRepository };
