const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../api/.env') });

const { VideoTranscoder } = require('./src/services/transcoder');
const { DatabaseClient, DrizzleMediaAssetRepository } = require('../../packages/infrastructure/database/src');
const { PostgresQueueProvider } = require('../../packages/infrastructure/queue/src');
const { WorkerPool } = require('./src/workers');
const { JOBS } = require('./src/jobs');
const { PROCESSORS } = require('./src/processors');

async function testVideoPipeline() {
  console.log('🎬 [TEST] Starting Video HLS Transcoding Pipeline Validation...\n');

  const transcoder = new VideoTranscoder();
  const testDir = path.resolve(__dirname, 'test_output_video');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const inputVideoPath = path.join(testDir, 'source_test.mp4');
  const hlsOutputDir = path.join(testDir, 'hls');

  // --- Step 1: Generate Synthetic MP4 Source ---
  console.log('--- 1. Generating Synthetic MP4 Video via FFmpeg ---');
  await transcoder.createSyntheticVideo(inputVideoPath, 3);
  assert.ok(fs.existsSync(inputVideoPath), 'Synthetic MP4 should exist');
  console.log(`✅ Source video generated: ${inputVideoPath} (${fs.statSync(inputVideoPath).size} bytes)`);

  // --- Step 2: Transcode to Multi-Bitrate HLS ---
  console.log('\n--- 2. Transcoding to Multi-Bitrate HLS (360p, 720p, 1080p + master.m3u8 + poster.jpg) ---');
  const result = await transcoder.transcodeHLS(inputVideoPath, hlsOutputDir, { segmentDuration: 2 });

  // Assertions on generated files
  assert.ok(fs.existsSync(result.masterPlaylistPath), 'master.m3u8 must exist');
  assert.ok(fs.existsSync(result.posterPath), 'poster.jpg thumbnail must exist');

  const masterContent = fs.readFileSync(result.masterPlaylistPath, 'utf-8');
  assert.ok(masterContent.includes('#EXTM3U'), 'master.m3u8 must contain #EXTM3U header');
  assert.ok(masterContent.includes('360p/index.m3u8'), 'master.m3u8 must reference 360p variant');
  assert.ok(masterContent.includes('720p/index.m3u8'), 'master.m3u8 must reference 720p variant');
  assert.ok(masterContent.includes('1080p/index.m3u8'), 'master.m3u8 must reference 1080p variant');
  console.log(`✅ master.m3u8 verified:\n${masterContent.trim()}`);

  assert.ok(fs.existsSync(path.join(hlsOutputDir, '360p', 'index.m3u8')), '360p playlist exists');
  assert.ok(fs.existsSync(path.join(hlsOutputDir, '720p', 'index.m3u8')), '720p playlist exists');
  assert.ok(fs.existsSync(path.join(hlsOutputDir, '1080p', 'index.m3u8')), '1080p playlist exists');
  console.log(`✅ All resolution variants generated with TS segments and poster thumbnail.`);

  // --- Step 3: End-to-End Worker Job Execution & Neon Database Update ---
  console.log('\n--- 3. Testing Worker Processor & Neon DB Status Update ---');
  const dbClient = new DatabaseClient({ connectionString: process.env.DATABASE_URL });
  await dbClient.connect();

  // Create a real media_assets row in Neon DB to test status transition
  const testAssetId = crypto.randomUUID();
  const tenantsRes = await dbClient.query(`SELECT id FROM tenants LIMIT 1`);
  const tenantId = tenantsRes.rows[0]?.id || crypto.randomUUID();

  await dbClient.query(`
    INSERT INTO media_assets (id, tenant_id, filename, mime_type, size_bytes, storage_key, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'ENCODING', NOW(), NOW())
  `, [
    testAssetId,
    tenantId,
    'source_test.mp4',
    'video/mp4',
    fs.statSync(inputVideoPath).size,
    `test/${testAssetId}/source_test.mp4`
  ]);
  console.log(`✅ Provisioned media_assets record in Neon DB with status='ENCODING' (ID: ${testAssetId})`);

  // Execute processor directly
  const processorResult = await PROCESSORS[JOBS.VIDEO_TRANSCODE]({
    mediaAssetId: testAssetId,
    filename: 'source_test.mp4',
    filePath: inputVideoPath
  });

  assert.equal(processorResult.success, true);
  assert.ok(processorResult.manifestUrl.includes(testAssetId));
  console.log(`✅ Processor completed successfully. Manifest URL: ${processorResult.manifestUrl}`);

  // Verify status in Neon DB is updated to READY
  const verifyRes = await dbClient.query(`SELECT status, hls_manifest_url FROM media_assets WHERE id = $1`, [testAssetId]);
  assert.equal(verifyRes.rows[0].status, 'READY');
  assert.equal(verifyRes.rows[0].hls_manifest_url, processorResult.manifestUrl);
  console.log(`✅ Neon DB record verified: status='READY', hls_manifest_url='${verifyRes.rows[0].hls_manifest_url}'`);

  // Cleanup
  await dbClient.disconnect();
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🎉 ALL VIDEO HLS PIPELINE TESTS PASSED 100%! 🚀\n');
}

testVideoPipeline().catch((err) => {
  console.error('❌ Video pipeline test failed:', err);
  process.exit(1);
});
