const RESET_CONFIG_ERROR = 'Password reset requires a valid APP_URL with HTTPS outside development and test.';

function getPasswordResetBaseUrl() {
  const allowHttp = ['development', 'test'].includes(process.env.NODE_ENV);
  const configured = process.env.APP_URL?.trim() || (allowHttp ? 'http://localhost:3000' : '');
  let base;
  try {
    base = new URL(configured);
  } catch {
    throw new Error(RESET_CONFIG_ERROR);
  }

  if ((base.protocol !== 'https:' && !(allowHttp && base.protocol === 'http:')) ||
      base.username || base.password || base.search || base.hash) {
    throw new Error(RESET_CONFIG_ERROR);
  }

  if (!base.pathname.endsWith('/')) base.pathname += '/';
  return base;
}

function createPasswordResetLink(token) {
  const link = new URL('reset-password', getPasswordResetBaseUrl());
  link.hash = new URLSearchParams({ token }).toString();
  return link.href;
}

module.exports = { createPasswordResetLink, getPasswordResetBaseUrl };
