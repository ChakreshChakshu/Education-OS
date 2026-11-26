const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Writable } = require('node:stream');
const Fastify = require('fastify');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const publicRoutes = require('../src/routes/v1/public');
const { requestLogDetails } = require('../src/bootstrap/requestLogging');
const { identityDomain, infraMail } = require('../src/bootstrap/domain-bridge');
const { OutboxPublisher } = require('../../worker/src/outbox/publisher');
const { PROCESSORS } = require('../../worker/src/processors');

const prefix = '/api/v1/public';
const email = 'fixture@example.test';
const otherEmail = 'unknown@example.test';
const initialPassword = 'InitialPassword123!';
const newPassword = 'NewSecretPassword456!';

function setEnvironment(t, { appUrl, environment = 'production' }) {
  const previous = { appUrl: process.env.APP_URL, environment: process.env.NODE_ENV };
  process.env.NODE_ENV = environment;
  if (appUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = appUrl;
  t.after(() => {
    if (previous.appUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous.appUrl;
    if (previous.environment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.environment;
  });
}

async function buildFixture(t) {
  const { User } = identityDomain.domain;
  const { LoginUserUseCase } = identityDomain.application;
  const passwordHasher = {
    hash: (value) => bcrypt.hash(value, 4),
    compare: (value, hash) => bcrypt.compare(value, hash)
  };
  const user = User.create({
    name: 'Fixture Student', email, passwordHash: await passwordHasher.hash(initialPassword)
  }).getValue();
  const secret = randomUUID();
  const tokenService = {
    generateToken: (claims, options) => jwt.sign(claims, secret, options),
    verifyToken: (token) => {
      try { return jwt.verify(token, secret); } catch { return null; }
    }
  };
  const userRepository = {
    findByEmail: async (recipient) => recipient === email ? user : null,
    findById: async (id) => id === user.id ? user : null,
    updatePassword: async (id, hash) => {
      assert.equal(id, user.id);
      user.updatePassword(hash);
    }
  };
  const events = [];
  const sentEmails = [];
  const revokedSessions = [];
  const services = {
    UserRepository: userRepository,
    PasswordHasher: passwordHasher,
    TokenService: tokenService,
    UserSessionRepository: { revokeAllForUser: async (id) => revokedSessions.push(id) },
    OutboxRepository: { create: async (event) => events.push(event) },
    LoginUserUseCase: new LoginUserUseCase({ userRepository, passwordHasher, tokenService })
  };
  t.mock.method(infraMail.ResendMailProvider.prototype, 'sendMail', async (mail) => {
    sentEmails.push(mail);
    return { id: 'fixture-email' };
  });

  const log = [];
  const stream = new Writable({
    write(chunk, encoding, done) {
      log.push(chunk.toString());
      done();
    }
  });
  const app = Fastify({ logger: { stream, serializers: { req: requestLogDetails } } });
  t.after(() => app.close());
  await app.register(require('@fastify/cookie'));
  await app.register(publicRoutes, {
    prefix,
    container: { resolve: (name) => services[name] }
  });

  return {
    app, events, log, sentEmails, services, revokedSessions, user,
    requestReset: (recipient, headers) => app.inject({
      method: 'POST', url: `${prefix}/auth/forgot-password`, payload: { email: recipient }, headers
    })
  };
}

async function deliverResetEmail(event) {
  const { jobName, payload } = new OutboxPublisher(null, null).translateEventToJob(event);
  return PROCESSORS[jobName](payload);
}

test('reset delivery uses configured HTTPS and keeps tokens out of public responses and API logs', async (t) => {
  setEnvironment(t, { appUrl: 'https://portal.example.test/campus/' });
  const { app, events, requestReset, log, sentEmails, revokedSessions, user } = await buildFixture(t);
  const headers = { origin: 'https://other.example.test', referer: 'https://other.example.test/recovery' };
  const known = await requestReset(email, headers);
  const unknown = await requestReset(otherEmail, headers);
  assert.equal(known.statusCode, 200);
  assert.equal(known.headers['cache-control'], 'no-store');
  assert.equal(known.body, unknown.body);
  assert.deepEqual(Object.keys(known.json()), ['success', 'message']);
  assert.equal(events.length, 1);
  assert.equal(sentEmails.length, 0);

  const { resetToken } = events[0].payload;
  assert.equal(known.body.includes(resetToken), false);
  await deliverResetEmail(events[0]);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, email);
  const link = new URL(sentEmails[0].text.match(/https:\/\/[^\s]+/)[0]);
  assert.equal(link.origin, 'https://portal.example.test');
  assert.equal(link.pathname, '/campus/reset-password');
  assert.equal(link.search, '');
  assert.equal(new URLSearchParams(link.hash.slice(1)).get('token'), resetToken);

  const verifyPath = `${prefix}/auth/verify-reset-token`;
  const verify = await app.inject({ method: 'POST', url: verifyPath, payload: { token: resetToken } });
  assert.equal(verify.statusCode, 200);
  assert.equal(verify.headers['cache-control'], 'no-store');
  assert.equal(verify.json().email, email);
  assert.equal((await app.inject(`${verifyPath}?token=${encodeURIComponent(resetToken)}`)).statusCode, 200);
  assert.equal((await app.inject({
    method: 'POST', url: verifyPath, payload: { token: 'invalid-fixture' }
  })).statusCode, 400);
  assert.equal(log.join('').includes(resetToken), false);

  const reset = await app.inject({
    method: 'POST', url: `${prefix}/auth/reset-password`, payload: { token: resetToken, password: newPassword }
  });
  assert.equal(reset.statusCode, 200);
  assert.deepEqual(revokedSessions, [user.id]);

  const login = (password) => app.inject({
    method: 'POST', url: `${prefix}/auth/login`, payload: { email, password }
  });
  assert.equal((await login(initialPassword)).statusCode, 401);
  assert.equal((await login(newPassword)).statusCode, 200);
});

test('development and outbox failures return the same acknowledgment without debug details', async (t) => {
  setEnvironment(t, { environment: 'development' });
  const { events, requestReset, sentEmails, services, log } = await buildFixture(t);
  const known = await requestReset(email, { origin: 'https://other.example.test' });
  const unknown = await requestReset(otherEmail);
  assert.equal(known.body, unknown.body);
  assert.deepEqual(Object.keys(known.json()), ['success', 'message']);
  assert.equal(events.length, 1);
  await deliverResetEmail(events[0]);
  assert.match(sentEmails[0].text, /http:\/\/localhost:3000\/reset-password#token=/);
  assert.doesNotMatch(sentEmails[0].text, /other\.example\.test/);

  const sensitiveValue = events[0].payload.resetToken;
  services.OutboxRepository.create = async () => { throw new Error(sensitiveValue); };
  const failure = await requestReset(email);
  assert.equal(failure.body, unknown.body);
  assert.equal(log.join('').includes(sensitiveValue), false);
  assert.equal(sentEmails.length, 1);
});

test('production without a valid app URL queues no reset and reveals no configuration details', async (t) => {
  setEnvironment(t, {});
  const { requestReset, events, log } = await buildFixture(t);

  for (const appUrl of [undefined, 'http://portal.example.test', 'https://portal.example.test/?source=bad']) {
    if (appUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = appUrl;
    const known = await requestReset(email, { referer: 'https://other.example.test/account' });
    const unknown = await requestReset(otherEmail);
    assert.equal(known.statusCode, 200);
    assert.equal(known.body, unknown.body);
    assert.equal(known.body.includes('APP_URL'), false);
  }
  assert.deepEqual(events, []);
  assert.match(log.join(''), /valid APP_URL/);
});

test('queued legacy reset links use the configured host and provider errors omit their content', async (t) => {
  setEnvironment(t, { appUrl: 'https://portal.example.test' });
  const { events, requestReset, sentEmails } = await buildFixture(t);
  await requestReset(email);
  const event = events[0];
  const { resetToken } = event.payload;
  delete event.payload.resetToken;
  event.payload.resetUrl = `https://old.example.test/reset-password?token=${resetToken}`;

  await deliverResetEmail(event);
  assert.match(sentEmails[0].html, /https:\/\/portal\.example\.test\/reset-password#token=/);
  assert.doesNotMatch(sentEmails[0].html, /old\.example\.test/);

  t.mock.method(infraMail.ResendMailProvider.prototype, 'sendMail', async () => {
    throw new Error(`Fixture provider error: ${resetToken}`);
  });
  await assert.rejects(deliverResetEmail(event), { message: 'Password reset email delivery failed.' });
});
