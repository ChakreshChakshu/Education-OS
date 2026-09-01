const { AggregateRoot, Result } = require('../../core');
const { TenantSlug } = require('../value-objects/TenantSlug');
const crypto = require('crypto');

class Tenant extends AggregateRoot {
  constructor(props, id) {
    super(id || props.id || crypto.randomUUID());
    this.props = {
      name: props.name,
      slug: props.slug,
      status: props.status || 'ACTIVE',
      settingsJson: props.settingsJson || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      deletedAt: props.deletedAt || null,
      version: props.version || 1
    };
  }

  get name() {
    return this.props.name;
  }

  get slug() {
    return this.props.slug;
  }

  get status() {
    return this.props.status;
  }

  get settingsJson() {
    return this.props.settingsJson;
  }

  suspend() {
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
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Tenant name is required.');
    }
    if (!props.slug) {
      return Result.fail('Tenant slug is required.');
    }

    let slugVo = props.slug;
    if (!(slugVo instanceof TenantSlug)) {
      const slugResult = TenantSlug.create(props.slug);
      if (slugResult.isFailure) {
        return Result.fail(slugResult.error);
      }
      slugVo = slugResult.getValue();
    }

    const tenant = new Tenant(
      {
        ...props,
        slug: slugVo
      },
      id
    );

    return Result.ok(tenant);
  }
}

module.exports = { Tenant };
