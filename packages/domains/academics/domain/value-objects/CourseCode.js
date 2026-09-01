const { ValueObject, Result } = require('../../core');

class CourseCode extends ValueObject {
  get value() {
    return this.props.value;
  }

  static isValid(code) {
    if (typeof code !== 'string') return false;
    const trimmed = code.trim();
    // Must be 3 to 20 uppercase alphanumeric chars/hyphens (e.g. CS-101, MATH-202)
    return /^[A-Z0-9-]{3,20}$/i.test(trimmed);
  }

  static create(code) {
    if (!code || !CourseCode.isValid(code)) {
      return Result.fail('Invalid course code format. Must be 3-20 alphanumeric chars/hyphens (e.g. CS-101).');
    }
    return Result.ok(new CourseCode({ value: code.trim().toUpperCase() }));
  }
}

module.exports = { CourseCode };
