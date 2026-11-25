const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Fastify = require('fastify');

const uploadRoutes = require('../src/routes/uploads');
const internalRoutes = require('../src/routes/v1/internal');

test('upload routes serve local and object storage files and reject files outside the upload directory', async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'eos-media-test-'));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  const uploadsRoot = path.join(fixture, 'uploads');
  await fs.mkdir(path.join(uploadsRoot, 'hls'), { recursive: true });
  await fs.writeFile(path.join(uploadsRoot, 'hls', 'master.m3u8'), '#EXTM3U');
  const externalFile = path.join(fixture, 'private.txt');
  await fs.writeFile(externalFile, 'outside uploads');
  await fs.symlink(externalFile, path.join(uploadsRoot, 'linked.txt'));

  const storageKeys = [];
  const app = Fastify();
  t.after(() => app.close());
  await app.register(uploadRoutes, {
    uploadsRoot,
    container: {
      resolve: () => ({
        download: async (key) => {
          storageKeys.push(key);
          return Buffer.from('segment');
        }
      })
    }
  });

  const playlist = await app.inject('/uploads/hls/master.m3u8');
  assert.equal(playlist.statusCode, 200);
  assert.equal(playlist.body, '#EXTM3U');
  assert.match(playlist.headers['content-type'], /^application\/vnd\.apple\.mpegurl/);

  const segment = await app.inject('/uploads/hls/segment.ts');
  assert.equal(segment.statusCode, 200);
  assert.equal(segment.body, 'segment');
  assert.equal((await app.inject('/uploads/linked.txt')).statusCode, 404);
  assert.deepEqual(storageKeys, ['hls/segment.ts']);
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
