class Result {
  constructor(isSuccess, error, value) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result must contain an error');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this.value = value;
    Object.freeze(this);
  }

  getValue() {
    if (!this.isSuccess) {
      throw new Error(`Cant retrieve the value from a failed result. Error: ${this.error}`);
    }
    return this.value;
  }

  static ok(value) {
    return new Result(true, null, value);
  }

  static fail(error) {
    return new Result(false, error, null);
  }

  static combine(results) {
    for (const result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok();
  }
}

module.exports = { Result };
