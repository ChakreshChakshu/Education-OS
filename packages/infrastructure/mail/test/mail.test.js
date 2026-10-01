const test = require('node:test');
const assert = require('node:assert/strict');
const { ResendMailProvider, MailProvider } = require('../src');

test('MailProvider is an abstract class and cannot be instantiated directly', () => {
  assert.throws(() => new MailProvider(), /cannot be instantiated directly/);
});

test('ResendMailProvider falls back to mock mode gracefully when no apiKey is set', async () => {
  const provider = new ResendMailProvider({ apiKey: '' });
  const result = await provider.sendMail({
    to: 'student@example.com',
    subject: 'Welcome to EducationOS',
    html: '<p>Hello!</p>'
  });

  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.deepEqual(result.to, ['student@example.com']);
  assert.equal(result.subject, 'Welcome to EducationOS');
  assert.ok(result.id.startsWith('mock_'));
});

test('ResendMailProvider calls Resend API endpoint with Bearer token and JSON body', async () => {
  let capturedUrl = null;
  let capturedOptions = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend_email_12345' })
    };
  };

  const provider = new ResendMailProvider({
    apiKey: 're_test_123456789',
    fromEmail: 'Academics <academics@myinstitution.edu>',
    fetchFn: mockFetch
  });

  const result = await provider.sendMail({
    to: 'jane.student@domain.edu',
    subject: 'Course Invitation: Architecture Core',
    html: '<h1>Welcome!</h1>',
    text: 'Welcome!'
  });

  assert.equal(result.success, true);
  assert.equal(result.id, 'resend_email_12345');
  assert.equal(capturedUrl, 'https://api.resend.com/emails');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.headers['Authorization'], 'Bearer re_test_123456789');

  const parsedBody = JSON.parse(capturedOptions.body);
  assert.deepEqual(parsedBody.to, ['jane.student@domain.edu']);
  assert.equal(parsedBody.from, 'Academics <academics@myinstitution.edu>');
  assert.equal(parsedBody.subject, 'Course Invitation: Architecture Core');
  assert.equal(parsedBody.html, '<h1>Welcome!</h1>');
  assert.equal(parsedBody.text, 'Welcome!');
});

test('ResendMailProvider throws clear descriptive error when Resend API returns an error', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ message: 'Domain not verified' })
  });

  const provider = new ResendMailProvider({
    apiKey: 're_invalid_key',
    fetchFn: mockFetch
  });

  await assert.rejects(
    () => provider.sendMail({
      to: 'fail@domain.edu',
      subject: 'Error test',
      html: '<p>Test</p>'
    }),
    /\[ResendMailProvider\] Failed to send email: Domain not verified/
  );
});
