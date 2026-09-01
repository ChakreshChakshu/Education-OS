const { Entity, Result } = require('../../core');
const crypto = require('crypto');

class UserTenantMembership extends Entity {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      userId: props.userId,
      tenantId: props.tenantId,
      status: props.status || 'ACTIVE',
      joinedAt: props.joinedAt || new Date(),
      lastActiveAt: props.lastActiveAt || null,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get userId() {
    return this.props.userId;
  }

  get tenantId() {
    return this.props.tenantId;
  }

  get status() {
    return this.props.status;
  }

  static create(props, id) {
    if (!props.userId) {
      return Result.fail('User ID is required for tenant membership.');
    }
    if (!props.tenantId) {
      return Result.fail('Tenant ID is required for tenant membership.');
    }

    const membership = new UserTenantMembership(props, id);
    return Result.ok(membership);
  }
}

module.exports = { UserTenantMembership };
