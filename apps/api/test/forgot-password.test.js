const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { container } = require('../src/bootstrap/container');
const { registerProviders } = require('../src/bootstrap/providers');
const { registerServices } = require('../src/bootstrap/services');
const publicV1Routes = require('../src/routes/v1/public');

async function buildApp() {
  const app = Fastify();
  await app.register(require('@fastify/cookie'));
  process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
  registerProviders(container);
  registerServices(container);

  // Mock MailProvider for test inspection
  const sentEmails = [];
  container.register('MailProvider', () => ({
    sendMail: async ({ to, subject, html, text }) => {
      sentEmails.push({ to, subject, html, text });
      return { id: `test_msg_${Date.now()}`, success: true };
    }
  }));

  await app.register(publicV1Routes, { prefix: '/api/v1/public', container });

  return { app, sentEmails };
}

test('Password Reset End-to-End Flow', async (t) => {
  const { app, sentEmails } = await buildApp();
  const userRepo = container.resolve('UserRepository');
  const passwordHasher = container.resolve('PasswordHasher');
  const tokenService = container.resolve('TokenService');

  const uniqueEmail = `testreset_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@university.edu`;
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'NewSecretPassword456!';

  // 1. Register a test user
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/register',
    payload: {
      email: uniqueEmail,
      password: initialPassword,
      name: 'Dr. Jane Doe'
    }
  });
  assert.equal(regRes.statusCode, 201);

  // 2. Request forgot password for this email
  const forgotRes = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/forgot-password',
    payload: {
      email: uniqueEmail
    }
  });
  assert.equal(forgotRes.statusCode, 200);
  const forgotBody = JSON.parse(forgotRes.payload);
  assert.equal(forgotBody.success, true);

  // Verify email was sent via MailProvider
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, uniqueEmail);
  assert.ok(sentEmails[0].subject.includes('Password'));
  assert.ok(sentEmails[0].html.includes('reset-password?token='));

  // Extract token from email html
  const match = sentEmails[0].html.match(/reset-password\?token=([^"'\s&]+)/);
  assert.ok(match, 'Token should be present in reset link in email');
  const resetToken = decodeURIComponent(match[1]);

  // 3. Verify valid reset token
  const verifyRes = await app.inject({
    method: 'GET',
    url: `/api/v1/public/auth/verify-reset-token?token=${encodeURIComponent(resetToken)}`
  });
  assert.equal(verifyRes.statusCode, 200);
  const verifyBody = JSON.parse(verifyRes.payload);
  assert.equal(verifyBody.success, true);
  assert.equal(verifyBody.email, uniqueEmail);
  assert.equal(verifyBody.name, 'Dr. Jane Doe');

  // 4. Verify invalid token rejection
  const invalidVerifyRes = await app.inject({
    method: 'GET',
    url: '/api/v1/public/auth/verify-reset-token?token=completely-bogus-token'
  });
  assert.equal(invalidVerifyRes.statusCode, 400);

  // 5. Submit new password with reset token
  const resetRes = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/reset-password',
    payload: {
      token: resetToken,
      password: newPassword
    }
  });
  assert.equal(resetRes.statusCode, 200);
  const resetBody = JSON.parse(resetRes.payload);
  assert.equal(resetBody.success, true);

  // 6. Verify that old password fails login
  const failedLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/login',
    payload: {
      email: uniqueEmail,
      password: initialPassword
    }
  });
  assert.equal(failedLoginRes.statusCode, 401);

  // 7. Verify that new password successfully logs in!
  const successLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/public/auth/login',
    payload: {
      email: uniqueEmail,
      password: newPassword
    }
  });
  assert.equal(successLoginRes.statusCode, 200);
  const loginBody = JSON.parse(successLoginRes.payload);
  assert.equal(loginBody.success, true);
  assert.equal(loginBody.user.email, uniqueEmail);
  process.exit(0);
});
