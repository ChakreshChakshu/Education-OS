class ITenantRepository {
  async findById(id) {
    throw new Error('Method findById() not implemented');
  }

  async findBySlug(slugStr) {
    throw new Error('Method findBySlug() not implemented');
  }

  async save(tenant) {
    throw new Error('Method save() not implemented');
  }

  async saveUserMembership(userTenantMembership) {
    throw new Error('Method saveUserMembership() not implemented');
  }

  async findUserMembership(userId, tenantId) {
    throw new Error('Method findUserMembership() not implemented');
  }
}

module.exports = { ITenantRepository };
