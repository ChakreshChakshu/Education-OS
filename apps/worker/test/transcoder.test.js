const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const path = require('path');
const { VideoTranscoder } = require('../src/services/transcoder');

const TEST_SCRATCH = path.resolve(__dirname, '../scratch/test');

test.before(() => {
  if (!fs.existsSync(TEST_SCRATCH)) {
    fs.mkdirSync(TEST_SCRATCH, { recursive: true });
  }
});

test.after(() => {
  try {
    fs.rmSync(TEST_SCRATCH, { recursive: true, force: true });
  } catch (e) {
    // cleanup
  }
});

test('VideoTranscoder generates synthetic test video', async () => {
  const transcoder = new VideoTranscoder();
  const testVideoPath = path.join(TEST_SCRATCH, 'synthetic_test.mp4');

  await transcoder.createSyntheticVideo(testVideoPath, 2);
  assert.equal(fs.existsSync(testVideoPath), true);
  assert.ok(fs.statSync(testVideoPath).size > 0);
});

test('VideoTranscoder probes video duration, dimensions, and codec', async () => {
  const transcoder = new VideoTranscoder();
  const testVideoPath = path.join(TEST_SCRATCH, 'synthetic_test.mp4');

  const info = await transcoder.probe(testVideoPath);
  assert.equal(info.width, 1280);
  assert.equal(info.height, 720);
  assert.equal(info.codec, 'h264');
  assert.ok(info.duration >= 1.9);
});

test('VideoTranscoder transcodes MP4 into multi-bitrate HLS and poster thumbnail', async () => {
  const transcoder = new VideoTranscoder();
  const testVideoPath = path.join(TEST_SCRATCH, 'synthetic_test.mp4');
  const hlsOutputDir = path.join(TEST_SCRATCH, 'hls_output');

  const result = await transcoder.transcodeHLS(testVideoPath, hlsOutputDir, {
    segmentDuration: 2
  });

  // Verify master playlist
  assert.equal(fs.existsSync(result.masterPlaylistPath), true);
  const masterContent = fs.readFileSync(result.masterPlaylistPath, 'utf-8');
  assert.ok(masterContent.includes('#EXTM3U'));
  assert.ok(masterContent.includes('360p/index.m3u8'));
  assert.ok(masterContent.includes('720p/index.m3u8'));
  assert.ok(masterContent.includes('1080p/index.m3u8'));

  // Verify variant playlists and segments
  assert.equal(fs.existsSync(path.join(hlsOutputDir, '360p', 'index.m3u8')), true);
  assert.equal(fs.existsSync(path.join(hlsOutputDir, '720p', 'index.m3u8')), true);
  assert.equal(fs.existsSync(path.join(hlsOutputDir, '1080p', 'index.m3u8')), true);

  // Verify poster thumbnail
  assert.equal(fs.existsSync(result.posterPath), true);
  assert.ok(fs.statSync(result.posterPath).size > 0);
});

test('Video transcoding processor verifies asset ownership and updates only matching lessons', async (t) => {
  const { PROCESSORS } = require('../src/processors');
  const { JOBS } = require('../src/jobs');
  const { DatabaseClient } = require('../../../packages/infrastructure/database/src');
  const { R2StorageProvider } = require('../../../packages/infrastructure/storage/src');
  const transcoder = new VideoTranscoder();
  const mediaAssetId = randomUUID();
  const tenantId = randomUUID();
  const storageKey = `${mediaAssetId}.mp4`;
  const storageUrl = `/uploads/${storageKey}`;
  const tempUploads = path.join(os.tmpdir(), 'eos_uploads');
  fs.mkdirSync(tempUploads, { recursive: true });
  const testVideoPath = path.join(tempUploads, storageKey);
  const mirroredOutput = path.resolve(__dirname, '../../api/uploads/hls', mediaAssetId);
  t.after(() => {
    fs.rmSync(testVideoPath, { force: true });
    fs.rmSync(mirroredOutput, { recursive: true, force: true });
  });
  t.mock.method(R2StorageProvider.prototype, 'upload', async () => {});
  t.mock.method(R2StorageProvider.prototype, 'download', async () => null);
  const changes = [];
  t.mock.method(DatabaseClient.prototype, 'query', async (sql, params) => {
    if (sql.startsWith('SELECT')) {
      assert.deepEqual(params, [mediaAssetId]);
      return { rows: [{ tenant_id: tenantId, storage_key: storageKey, storage_url: storageUrl }] };
    }
    changes.push({ sql, params });
    return { rows: [] };
  });

  await assert.rejects(
    PROCESSORS[JOBS.VIDEO_TRANSCODE]({ mediaAssetId, tenantId: randomUUID() }),
    /Media asset not found for this tenant/
  );
  await assert.rejects(
    PROCESSORS[JOBS.VIDEO_TRANSCODE]({ mediaAssetId, tenantId }),
    /Source video not found/
  );
  assert.equal(changes.length, 0);

  await transcoder.createSyntheticVideo(testVideoPath, 2);
  const result = await PROCESSORS[JOBS.VIDEO_TRANSCODE]({ mediaAssetId, tenantId, filePath: testVideoPath });

  assert.equal(result.success, true);
  assert.equal(result.mediaAssetId, mediaAssetId);
  assert.match(result.manifestUrl, /master\.m3u8$/);
  assert.deepEqual(result.variants, ['360p', '720p', '1080p']);
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0].params, [result.manifestUrl, mediaAssetId, tenantId, null]);
  assert.match(changes[0].sql, /course.tenant_id = asset.tenant_id/);
  assert.match(changes[0].sql, /NULLIF\(asset.storage_url, ''\) = lesson.content_url/);
});

test('Email processor renders student invitation template and dispatches via ResendMailProvider', async () => {
  const { PROCESSORS } = require('../src/processors');
  const { JOBS } = require('../src/jobs');

  const result = await PROCESSORS[JOBS.EMAIL_SEND]({
    to: process.env.RESEND_TEST_RECIPIENT || 'sharma.ankush9193@gmail.com',
    template: 'student_invitation',
    name: 'Test Student',
    courseTitle: 'Enterprise Domain Architecture',
    courseCode: 'CS-401',
    temporaryPassword: 'Learn@9999',
    activationToken: 'eyJhbGciOiJIUzI1Ni...'
  });

  assert.equal(result.success, true);
  assert.ok(result.emailId);
});


