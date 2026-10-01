const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
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
