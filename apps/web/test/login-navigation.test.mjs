import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { completeLoginEnrollment, getPostLoginPath } from '../lib/login-navigation.js';

test('login keeps internal destinations and defaults to the dashboard', () => {
  const coursePath = '/courses/course-id?term=Fall%202026#details';
  assert.equal(getPostLoginPath(coursePath), coursePath);
  assert.equal(getPostLoginPath('/'), '/');
  assert.equal(getPostLoginPath(null), '/dashboard');
});

test('login rejects absolute URLs, ambiguous paths, and other schemes', () => {
  const invalidDestinations = [
    'https://external.example/',
    '//external.example/',
    '/\\external.example/',
    '/parent/..//external.example/',
    '/%2Fexternal.example/',
    '/%255cexternal.example/',
    'mailto:someone@example.com'
  ];
  for (const value of invalidDestinations) {
    assert.equal(getPostLoginPath(value), '/dashboard', value);
  }
});

test('auto-enrollment sends only the course and optional tenant', async () => {
  const courseId = randomUUID();
  const tenantId = randomUUID();
  const requests = [];
  const enroll = async (payload) => {
    requests.push(payload);
    return { success: true };
  };
  const result = await completeLoginEnrollment({ courseId, tenantId }, enroll);
  await completeLoginEnrollment({ courseId, tenantId: null }, enroll);
  assert.deepEqual(requests, [{ courseId, tenantId }, { courseId }]);
  assert.equal(result.destination, `/dashboard/courses?enrolled=${courseId}`);
});

test('invalid or rejected enrollment never produces a success destination', async () => {
  const courseId = randomUUID();
  let requestCount = 0;
  const reject = async () => {
    requestCount++;
    return { success: false, error: 'Course is unavailable.' };
  };
  const invalid = await completeLoginEnrollment({ courseId: 'unknown', tenantId: null }, reject);
  assert.deepEqual(invalid, { error: 'This enrollment link is invalid.' });
  assert.equal(requestCount, 0);
  const failure = await completeLoginEnrollment({ courseId, tenantId: randomUUID() }, reject);
  assert.deepEqual(failure, { error: 'Course is unavailable.' });
  assert.equal(requestCount, 1);
});
