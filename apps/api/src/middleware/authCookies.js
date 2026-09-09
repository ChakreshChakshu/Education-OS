const { randomBytes } = require('crypto');

const isProd = process.env.NODE_ENV === 'production';

// Secure requires HTTPS; browsers already treat localhost as a secure context
// for this purpose, but requiring it strictly here would break plain-http local
// dev against a remote/staging DB, so it's gated on NODE_ENV instead.
const baseOptions = {
  httpOnly: true,
  secure: isProd,
  path: '/'
};

// Sets all three auth cookies for a freshly issued (or rotated) session.
// csrfToken is NOT httpOnly — the frontend must be able to read it (via
// document.cookie) to echo it back as the x-csrf-token header.
function setAuthCookies(reply, { accessToken, refreshToken, csrfToken }) {
  reply.setCookie('access_token', accessToken, {
    ...baseOptions,
    sameSite: 'lax',
    maxAge: 15 * 60 // 15 minutes, matches the access token's own expiry
  });

  reply.setCookie('refresh_token', refreshToken, {
    ...baseOptions,
    sameSite: 'strict',
    path: '/api/v1/public/auth', // only sent to the refresh/logout endpoints
    maxAge: 30 * 24 * 60 * 60 // 30 days, matches the session's own expiry
  });

  reply.setCookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60
  });
}

function clearAuthCookies(reply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/api/v1/public/auth' });
  reply.clearCookie('csrf_token', { path: '/' });
}

function generateCsrfToken() {
  return randomBytes(24).toString('hex');
}

module.exports = { setAuthCookies, clearAuthCookies, generateCsrfToken };
