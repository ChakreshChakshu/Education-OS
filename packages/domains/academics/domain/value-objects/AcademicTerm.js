const { ValueObject, Result } = require('../../core');

class AcademicTerm extends ValueObject {
  get value() {
    return this.props.value;
  }

  static isValid(term) {
    if (typeof term !== 'string') return false;
    const trimmed = term.trim();
    // Must be term name + year (e.g. FALL-2026, SPRING-2027)
    return /^[A-Z0-9-]{4,30}$/i.test(trimmed);
  }

  static create(term) {
    if (!term || !AcademicTerm.isValid(term)) {
      return Result.fail('Invalid academic term format. Expected e.g. FALL-2026.');
    }
    return Result.ok(new AcademicTerm({ value: term.trim().toUpperCase() }));
  }
}

module.exports = { AcademicTerm };
