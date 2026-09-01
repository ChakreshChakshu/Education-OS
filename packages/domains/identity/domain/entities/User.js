const { AggregateRoot, Result } = require('../../core');
const { Email } = require('../value-objects/Email');
const crypto = require('crypto');

class User extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      email: props.email,
      passwordHash: props.passwordHash,
      name: props.name,
      avatar: props.avatar || null,
      phone: props.phone || null,
      timezone: props.timezone || 'UTC',
      language: props.language || 'en',
      emailVerifiedAt: props.emailVerifiedAt || null,
      status: props.status || 'ACTIVE',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      deletedAt: props.deletedAt || null,
      version: props.version || 1
    };
  }

  get email() {
    return this.props.email;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get name() {
    return this.props.name;
  }

  get status() {
    return this.props.status;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  suspend() {
    if (this.props.status === 'SUSPENDED') {
      return Result.fail('User is already suspended.');
    }
    this.props.status = 'SUSPENDED';
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  activate() {
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  static create(props, id) {
    if (!props.email) {
      return Result.fail('User email is required.');
    }
    if (!props.passwordHash) {
      return Result.fail('User password hash is required.');
    }
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('User name is required.');
    }

    let emailVo = props.email;
    if (!(emailVo instanceof Email)) {
      const emailResult = Email.create(props.email);
      if (emailResult.isFailure) {
        return Result.fail(emailResult.error);
      }
      emailVo = emailResult.getValue();
    }

    const user = new User(
      {
        ...props,
        email: emailVo
      },
      id
    );

    return Result.ok(user);
  }
}

module.exports = { User };
