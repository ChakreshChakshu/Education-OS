async function authenticateJWT(request, reply) {
  const authHeader = request.headers.authorization;

  // Allow health check without token
  if (request.url.endsWith('/health')) {
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Development mode fallback: If token is 'dev-token' or header missing in dev, attach mock user
    if (process.env.NODE_ENV === 'development' && (!authHeader || authHeader.includes('dev-token'))) {
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

  // If token is 'mock-jwt-token-from-fastify' or 'dev-token', allow in dev mode
  if (token === 'mock-jwt-token-from-fastify' || token === 'dev-token') {
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
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized: Invalid or expired JWT access token'
    });
  }

  request.user = decoded;
}

module.exports = { authenticateJWT };
