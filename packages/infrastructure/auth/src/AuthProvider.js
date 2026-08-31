class AuthProvider {
  constructor() {
    if (this.constructor === AuthProvider) {
      throw new Error("Abstract class 'AuthProvider' cannot be instantiated directly.");
    }
  }

  async generateToken(payload, options = {}) {
    throw new Error("Method 'generateToken()' must be implemented.");
  }

  async verifyToken(token) {
    throw new Error("Method 'verifyToken()' must be implemented.");
  }

  async hashPassword(password) {
    throw new Error("Method 'hashPassword()' must be implemented.");
  }

  async comparePassword(password, hash) {
    throw new Error("Method 'comparePassword()' must be implemented.");
  }
}

module.exports = { AuthProvider };
