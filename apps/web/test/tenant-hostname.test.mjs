import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server.js';

import { getTenantSubdomain, selectTenantForHost } from '../lib/tenant-hostname.js';
import { proxy } from '../proxy.js';

test('only a single tenant label under a supported root selects a tenant', () => {
  const root = 'academy.example.co.uk';
  const hosts = [
    [root, null],
    [`www.${root}`, null],
    [`STEM-CAMPUS.${root.toUpperCase()}.:443`, 'stem-campus'],
    [`dept.stem-campus.${root}`, null],
    [`stem-campus.${root}.external.example`, null],
    ['feature.preview.example', null],
    ['localhost:3000', null],
    ['www.localhost:3000', null],
    ['stem-campus.localhost:3000', 'stem-campus'],
    ['lvh.me', null],
    ['stem-campus.lvh.me:3000', 'stem-campus'],
    ['127.0.0.1:3000', null],
    ['[::1]:3000', null]
  ];

  for (const [host, slug] of hosts) {
    assert.equal(getTenantSubdomain(host, root), slug, host);
  }
});

test('workspace selection preserves the preferred tenant on the apex and checks tenant subdomains', (t) => {
  setRootDomain(t, 'academy.example.co.uk');
  const north = { id: 'north', slug: 'north-campus' };
  const south = { id: 'south', slug: 'south-campus' };
  const tenants = [north, south];

  assert.deepEqual(selectTenantForHost('academy.example.co.uk', tenants, south.id),
    { tenant: south, missingTenantSlug: null });
  assert.deepEqual(selectTenantForHost('north-campus.academy.example.co.uk', tenants, south.id),
    { tenant: north, missingTenantSlug: null });
  assert.deepEqual(selectTenantForHost('west-campus.localhost', tenants, south.id),
    { tenant: null, missingTenantSlug: 'west-campus' });
});

test('tenant hosts rewrite storefronts and serve the shared dashboard and sign-in', (t) => {
  setRootDomain(t, 'academy.example.co.uk');
  const apex = 'academy.example.co.uk';
  const tenant = 'north-campus.academy.example.co.uk';
  const request = (host, path, cookie) => new NextRequest(`https://${host}${path}`, {
    headers: cookie ? { host, cookie } : { host }
  });

  assert.equal(proxy(request(apex, '/')).headers.get('x-middleware-next'), '1');
  const course = proxy(request(tenant, '/courses/course-id?term=fall'));
  assert.equal(course.headers.get('x-middleware-rewrite'),
    `https://${tenant}/org/north-campus/courses/course-id?term=fall`);
  assert.equal(proxy(request(tenant, '/')).headers.get('x-middleware-rewrite'),
    `https://${tenant}/org/north-campus`);

  assert.equal(proxy(request(tenant, '/login')).headers.get('x-middleware-next'), '1');
  const protectedPath = '/dashboard/courses';
  const guest = proxy(request(tenant, protectedPath));
  const redirect = new URL(guest.headers.get('location'));
  assert.equal(redirect.pathname, '/login');
  assert.equal(redirect.searchParams.get('redirect'), protectedPath);
  assert.equal(proxy(request(tenant, protectedPath, 'access_token=session')).headers.get('x-middleware-next'), '1');
});

function setRootDomain(t, value) {
  const previous = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = value;
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    else process.env.NEXT_PUBLIC_ROOT_DOMAIN = previous;
  });
}
