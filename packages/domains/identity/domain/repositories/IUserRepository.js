class IUserRepository {
  async findById(id) {
    throw new Error('Method findById() not implemented');
  }

  async findByEmail(emailStr) {
    throw new Error('Method findByEmail() not implemented');
  }

  async save(user) {
    throw new Error('Method save() not implemented');
  }
}

module.exports = { IUserRepository };
