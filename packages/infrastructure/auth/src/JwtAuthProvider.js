const { AuthProvider } = require('./AuthProvider');

class JwtAuthProvider extends AuthProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async generateToken(payload, options = {}) {
    console.log('[JwtAuthProvider] Mock generating JWT token for payload:', payload);
    return 'mock-jwt-token-string';
  }

  async verifyToken(token) {
    console.log('[JwtAuthProvider] Mock verifying JWT token:', token);
    return { userId: 'mock-user-id', role: 'student', tenantId: 'mock-tenant-id' };
  }

  async hashPassword(password) {
    console.log('[JwtAuthProvider] Mock hashing password');
    return `hashed_${password}`;
  }

  async comparePassword(password, hash) {
    console.log('[JwtAuthProvider] Mock comparing password with hash');
    return hash === `hashed_${password}`;
  }
}

module.exports = { JwtAuthProvider };
