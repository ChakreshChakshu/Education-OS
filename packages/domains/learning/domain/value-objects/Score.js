const { ValueObject, Result } = require('../../core');

class Score extends ValueObject {
  get value() {
    return this.props.value;
  }

  static isValid(val) {
    if (typeof val !== 'number' || isNaN(val)) return false;
    return val >= 0 && val <= 100;
  }

  static create(val) {
    if (!Score.isValid(val)) {
      return Result.fail('Score must be a number between 0 and 100.');
    }
    return Result.ok(new Score({ value: Math.round(val * 100) / 100 }));
  }
}

module.exports = { Score };
