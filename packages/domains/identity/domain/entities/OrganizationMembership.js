const { Entity, Result } = require('../../core');
const crypto = require('crypto');

const VALID_ROLES = ['TENANT_OWNER', 'ORG_ADMIN', 'INSTRUCTOR', 'STUDENT'];

class OrganizationMembership extends Entity {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      organizationId: props.organizationId,
      userId: props.userId,
      role: props.role,
      status: props.status || 'ACTIVE',
      joinedAt: props.joinedAt || new Date(),
      lastActiveAt: props.lastActiveAt || null,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  get organizationId() {
    return this.props.organizationId;
  }

  get userId() {
    return this.props.userId;
  }

  get role() {
    return this.props.role;
  }

  get status() {
    return this.props.status;
  }

  static create(props, id) {
    if (!props.organizationId) {
      return Result.fail('Organization ID is required for organization membership.');
    }
    if (!props.userId) {
      return Result.fail('User ID is required for organization membership.');
    }
    if (!props.role || !VALID_ROLES.includes(props.role)) {
      return Result.fail(`Invalid role. Allowed roles: ${VALID_ROLES.join(', ')}`);
    }

    const membership = new OrganizationMembership(props, id);
    return Result.ok(membership);
  }
}

module.exports = { OrganizationMembership, VALID_ROLES };
