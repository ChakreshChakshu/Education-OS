// Standard API response models
class ApiResponse {
  constructor(success, data = null, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success(data) {
    return new ApiResponse(true, data, null);
  }

  static failure(error) {
    return new ApiResponse(false, null, error);
  }
}

module.exports = { ApiResponse };
