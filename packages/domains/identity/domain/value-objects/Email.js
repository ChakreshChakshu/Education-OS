const { ValueObject, Result } = require('../../core');

class Email extends ValueObject {
  get value() {
    return this.props.value;
  }

  static isValid(email) {
    if (typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  static create(email) {
    if (!email || !this.isValid(email)) {
      return Result.fail('Invalid email address format.');
    }

    return Result.ok(new Email({ value: email.trim().toLowerCase() }));
  }
}

module.exports = { Email };
