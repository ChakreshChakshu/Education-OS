const { ValueObject, Result } = require('../../core');

class TenantSlug extends ValueObject {
  get value() {
    return this.props.value;
  }

  static isValid(slug) {
    if (typeof slug !== 'string') return false;
    const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slug.length >= 3 && slug.length <= 100 && re.test(slug);
  }

  static create(slug) {
    if (!slug) {
      return Result.fail('Tenant slug is required.');
    }
    const normalized = slug.trim().toLowerCase();
    if (!this.isValid(normalized)) {
      return Result.fail('Slug must be 3-100 characters, lowercase alphanumeric, hyphen separated.');
    }

    return Result.ok(new TenantSlug({ value: normalized }));
  }
}

module.exports = { TenantSlug };
