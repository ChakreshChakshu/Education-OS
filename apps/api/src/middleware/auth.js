async function authenticateJWT(request, reply) {
  const authHeader = request.headers.authorization;

  // Allow health check without token
  if (request.url.endsWith('/health')) {
    return;
  }

  // If no authorization header provided
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development') {
      request.user = {
        userId: '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8',
        email: 'admin@educationos.io',
        name: 'Dr. Harrison Admin',
        role: 'ADMIN'
      };
      return;
    }

    return reply.status(401).send({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization header. Expected format: "Bearer <token>"'
    });
  }

  const token = authHeader.substring(7).trim();

  // If token is dev/mock token, allow in development mode
  if (process.env.NODE_ENV === 'development' && (token === 'dev-token' || token.startsWith('mock_token_') || token.startsWith('mock-jwt-token'))) {
    request.user = {
      userId: '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8',
      email: 'admin@educationos.io',
      name: 'Dr. Harrison Admin',
      role: 'ADMIN'
    };
    return;
  }

  const tokenService = request.container.resolve('TokenService');
  const decoded = tokenService.verifyToken(token);

  if (!decoded) {
    // In development mode, fallback to default admin session if token expired/invalid
    if (process.env.NODE_ENV === 'development') {
      request.user = {
        userId: '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8',
        email: 'admin@educationos.io',
        name: 'Dr. Harrison Admin',
        role: 'ADMIN'
      };
      return;
    }

    return reply.status(401).send({
      success: false,
      error: 'Unauthorized: Invalid or expired JWT access token'
    });
  }

  request.user = decoded;
}

module.exports = { authenticateJWT };
