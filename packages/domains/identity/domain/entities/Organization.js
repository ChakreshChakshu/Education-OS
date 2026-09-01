const { Entity, Result } = require('../../core');
const crypto = require('crypto');

class Organization extends Entity {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      tenantId: props.tenantId,
      name: props.name,
      code: props.code || null,
      status: props.status || 'ACTIVE',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      deletedAt: props.deletedAt || null,
      version: props.version || 1
    };
  }

  get tenantId() {
    return this.props.tenantId;
  }

  get name() {
    return this.props.name;
  }

  get code() {
    return this.props.code;
  }

  get status() {
    return this.props.status;
  }

  static create(props, id) {
    if (!props.tenantId) {
      return Result.fail('Tenant ID is required for organization.');
    }
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Organization name is required.');
    }

    const organization = new Organization(props, id);
    return Result.ok(organization);
  }
}

module.exports = { Organization };
