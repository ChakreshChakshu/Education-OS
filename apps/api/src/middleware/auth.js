
const DEV_AUTH_BYPASS_ENABLED =
  process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true';

const DEV_BYPASS_USER = {
  userId: '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8',
  email: 'admin@educationos.io',
  name: 'Dr. Harrison Admin',
  role: 'ADMIN'
};

async function authenticateJWT(request, reply) {
  const authHeader = request.headers.authorization;


  const pathname = request.url.split('?')[0];
  if (pathname.endsWith('/health')) {
    return;
  }

  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const token = request.cookies.access_token || bearerToken;

  if (!token) {
    if (DEV_AUTH_BYPASS_ENABLED) {
      request.user = DEV_BYPASS_USER;
      return;
    }

    return reply.status(401).send({
      success: false,
      error: 'Unauthorized: No access token cookie or Authorization header present'
    });
  }

  // If token is dev/mock token, allow only with explicit opt-in
  if (DEV_AUTH_BYPASS_ENABLED && (token === 'dev-token' || token.startsWith('mock_token_') || token.startsWith('mock-jwt-token'))) {
    request.user = DEV_BYPASS_USER;
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
