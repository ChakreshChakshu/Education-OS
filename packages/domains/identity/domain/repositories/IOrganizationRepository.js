class IOrganizationRepository {
  async findById(id) {
    throw new Error('Method findById() not implemented');
  }

  async findByTenantId(tenantId) {
    throw new Error('Method findByTenantId() not implemented');
  }

  async save(organization) {
    throw new Error('Method save() not implemented');
  }

  async saveMembership(organizationMembership) {
    throw new Error('Method saveMembership() not implemented');
  }

  async findMembership(userId, organizationId) {
    throw new Error('Method findMembership() not implemented');
  }
}

module.exports = { IOrganizationRepository };
