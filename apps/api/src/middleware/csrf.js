const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit cookie CSRF protection (docs/auth_and_authorization.md's
// "Security Configuration Summary"): a cross-site page can make the browser
// send our cookies automatically, but it cannot read them to set a matching
// `x-csrf-token` header — only same-origin JS (via document.cookie) can.
//
// Only applies when the request actually carries one of our auth cookies.
// A Bearer-header client (mobile/API) never has these cookies, so it's exempt —
// which matches the doc's per-platform table (cookies for Web, Bearer for Mobile).
async function verifyCsrf(request, reply) {
  if (SAFE_METHODS.has(request.method)) {
    return;
  }

  const hasAuthCookie = Boolean(request.cookies.access_token || request.cookies.refresh_token);
  if (!hasAuthCookie) {
    return;
  }

  const cookieToken = request.cookies.csrf_token;
  const headerToken = request.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return reply.status(403).send({
      success: false,
      error: 'Forbidden: missing or invalid CSRF token'
    });
  }
}

module.exports = { verifyCsrf };
