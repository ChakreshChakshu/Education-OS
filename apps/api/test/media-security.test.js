const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Fastify = require('fastify');

const uploadRoutes = require('../src/routes/uploads');
const internalRoutes = require('../src/routes/v1/internal');
const publicRoutes = require('../src/routes/v1/public');

test('private media requires course access for every HLS file and serves published thumbnails', async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'eos-media-test-'));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  const uploadsRoot = path.join(fixture, 'uploads');
  const id = randomUUID();
  const tenantId = randomUUID();
  const studentId = randomUUID();
  const otherStudentId = randomUUID();
  const thumbnailId = randomUUID();
  const hlsRoot = path.join(uploadsRoot, 'hls', id);

  await fs.mkdir(hlsRoot, { recursive: true });
  await fs.writeFile(path.join(hlsRoot, 'master.m3u8'), '#EXTM3U\n720p/index.m3u8\n');
  const externalFile = path.join(fixture, 'private.txt');
  await fs.writeFile(externalFile, 'outside uploads');
  await fs.symlink(externalFile, path.join(hlsRoot, 'linked.txt'));

  const storageKeys = [];
  const media = {
    id, tenant_id: tenantId, storage_key: `private/${id}/video.mp4`,
    hls_manifest_url: `/uploads/hls/${id}/master.m3u8`, mime_type: 'video/mp4'
  };
  const thumbnail = {
    id: thumbnailId, tenant_id: tenantId, storage_key: `private/${thumbnailId}/thumbnail.png`, mime_type: 'image/png'
  };

  let enrollmentActive = true;
  let thumbnailPublished = true;
  const services = {
    DatabaseClient: { query: async (sql, params) => {
      if (sql.includes('FROM media_assets')) {
        return { rows: [media, thumbnail].filter((asset) => [asset.id, asset.storage_key].includes(params[0])) };
      }
      if (sql.includes('thumbnail_file_id')) return { rows: thumbnailPublished ? [{}] : [] };
      if (sql.includes('FROM users')) return { rows: [{}] };
      assert.match(sql, /e.status = 'ACTIVE'/);
      assert.equal(params[0], tenantId);
      assert.ok(params[2].includes(media.hls_manifest_url));
      return { rows: [{ organization_id: null, enrolled: enrollmentActive && params[1] === studentId }] };
    } },
    TokenService: { verifyToken: (token) => ({ userId: token }) },
    RoleAssignmentRepository: {
      hasPermission: async ({ tenantId: scope, permissionKey }) => scope === tenantId && permissionKey === 'lesson.read'
    },
    PrivateStorageProvider: {
      download: async (key) => {
        storageKeys.push(key);
        return Buffer.from('stored asset');
      }
    }
  };

  const app = Fastify();
  t.after(() => app.close());
  await app.register(require('@fastify/cookie'));
  await app.register(uploadRoutes, { uploadsRoot, container: { resolve: (name) => services[name] } });

  const playlistUrl = media.hls_manifest_url;
  const segmentUrl = `/uploads/hls/${id}/720p/segment.ts`;
  const student = { cookie: `access_token=${studentId}` };
  const otherStudent = { cookie: `access_token=${otherStudentId}` };
  assert.equal((await app.inject(playlistUrl)).statusCode, 404);
  assert.equal((await app.inject(segmentUrl)).statusCode, 404);
  assert.equal((await app.inject(`/uploads/${media.storage_key}`)).statusCode, 404);
  assert.equal((await app.inject({ url: segmentUrl, headers: otherStudent })).statusCode, 404);

  const playlist = await app.inject({ url: playlistUrl, headers: student });
  assert.equal(playlist.statusCode, 200);
  assert.match(playlist.body, /720p\/index.m3u8/);
  assert.match(playlist.headers['content-type'], /^application\/vnd\.apple\.mpegurl/);
  assert.equal(playlist.headers['cache-control'], 'private, no-store');
  const variant = await app.inject({ url: `/uploads/hls/${id}/720p/index.m3u8`, headers: student });
  assert.equal(variant.statusCode, 200);
  const segment = await app.inject({ url: segmentUrl, headers: student });
  assert.equal(segment.statusCode, 200);
  assert.equal(segment.body, 'stored asset');
  assert.equal((await app.inject({ url: `/uploads/hls/${id}/linked.txt`, headers: student })).statusCode, 404);

  enrollmentActive = false;
  assert.equal((await app.inject({ url: segmentUrl, headers: student })).statusCode, 404);
  const image = await app.inject(`/uploads/${thumbnail.storage_key}`);
  assert.equal(image.statusCode, 200);
  thumbnailPublished = false;
  assert.equal((await app.inject(`/uploads/${thumbnail.storage_key}`)).statusCode, 404);
  assert.deepEqual(storageKeys, [`private/hls/${id}/720p/index.m3u8`, `private/hls/${id}/720p/segment.ts`, thumbnail.storage_key]);
});

test('media status and confirmation use the authorized tenant', async (t) => {
  const tenantId = randomUUID();
  const assetId = randomUUID();
  const userId = randomUUID();
  const confirmationRequests = [];
  const databaseRequests = [];
  const services = {
    TokenService: { verifyToken: () => ({ userId }) },
    RoleAssignmentRepository: {
      findTenantsWithRolesForUser: async () => [{ tenantId, role: 'ADMIN' }],
      hasPermission: async () => true
    },
    ConfirmMediaUploadUseCase: {
      execute: async (input) => {
        confirmationRequests.push(input);
        return {
          isFailure: false,
          getValue: () => ({ id: assetId, tenantId, status: 'ENCODING' })
        };
      }
    },
    DatabaseClient: {
      query: async (sql, values) => {
        databaseRequests.push(values);
        assert.match(sql, /tenant_id = \$2/);
        return { rows: [] };
      }
    },
    OutboxRepository: { create: async () => {} }
  };

  const app = Fastify();
  t.after(() => app.close());
  await app.register(internalRoutes, {
    prefix: '/test',
    container: { resolve: (name) => services[name] }
  });

  const headers = { authorization: 'Bearer fixture-token', 'x-tenant-id': tenantId };
  const confirm = await app.inject({
    method: 'POST',
    url: '/test/media/confirm',
    headers,
    payload: { mediaAssetId: assetId, tenantId: randomUUID() }
  });
  assert.equal(confirm.statusCode, 200);
  assert.deepEqual(confirmationRequests, [{ mediaAssetId: assetId, tenantId }]);

  assert.equal((await app.inject({ url: '/test/media/status/invalid', headers })).statusCode, 400);
  assert.equal((await app.inject({ url: `/test/media/status/${assetId}`, headers })).statusCode, 404);
  assert.deepEqual(databaseRequests, [[assetId, tenantId]]);
});

test('course routes replace stored storage links with gated playback paths', async (t) => {
  const assetId = randomUUID();
  const tenantId = randomUUID();
  const courseId = randomUUID();
  const tenant = { id: tenantId, status: 'ACTIVE' };
  const storedUrl = `https://legacy-cdn.example/hls/${assetId}/master.m3u8`;
  const course = { id: courseId, tenantId, title: 'Course', visibility: 'PUBLIC' };
  const services = {
    TokenService: { verifyToken: () => ({ userId: randomUUID() }) },
    RoleAssignmentRepository: {
      findTenantsWithRolesForUser: async () => [{ tenantId }],
      hasPermission: async ({ permissionKey }) => permissionKey === 'lesson.read'
    },
    TenantRepository: { findBySlug: async () => tenant },
    CourseRepository: { findById: async () => course },
    LessonModuleRepository: {
      findByCourseId: async () => [{ contentType: 'VIDEO', contentUrl: storedUrl }]
    },
    EnrollmentRepository: { findByStudentAndCourse: async () => ({ tenantId, status: 'ACTIVE' }) },
    DatabaseClient: { query: async (sql, params) => {
      assert.deepEqual(params, [tenantId, [storedUrl]]);
      return { rows: [{ id: assetId, hls_manifest_url: storedUrl }] };
    } }
  };
  const app = Fastify();
  t.after(() => app.close());
  const container = { resolve: (name) => services[name] };
  await app.register(internalRoutes, { prefix: '/internal', container });
  await app.register(publicRoutes, { prefix: '/public', container });
  const lesson = await app.inject({
    url: `/internal/academics/courses/${courseId}/modules`,
    headers: { authorization: 'Bearer session' }
  });
  assert.equal(lesson.statusCode, 200);
  assert.equal(lesson.json().data[0].contentUrl, `/uploads/hls/${assetId}/master.m3u8`);

  const storefront = await app.inject(`/public/storefront/tenant/courses/${courseId}`);
  assert.equal(storefront.statusCode, 200);
  assert.equal(storefront.json().course.modules[0].contentUrl, null);
  assert.equal(storefront.body.includes(storedUrl), false);
});
