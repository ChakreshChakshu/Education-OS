const test = require('node:test');
const assert = require('node:assert/strict');

const { LocalStorageProvider, R2StorageProvider } = require('../src');

test('LocalStorageProvider uploads and generates local URLs', async () => {
  const provider = new LocalStorageProvider({ uploadDir: './test-uploads' });
  const uploadRes = await provider.upload('lesson-1.mp4', Buffer.from('test-data'), 'video/mp4');

  assert.equal(uploadRes.key, 'lesson-1.mp4');
  assert.equal(uploadRes.url, '/uploads/lesson-1.mp4');

  const signedUrl = await provider.getSignedUrl('lesson-1.mp4', 3600);
  assert.equal(signedUrl, '/uploads/lesson-1.mp4');
});

test('R2StorageProvider constructs Cloudflare R2 URLs and presigned targets', async () => {
  const provider = new R2StorageProvider({
    bucketName: 'production-media',
    publicDomain: 'https://cdn.skillyards.com'
  });

  const uploadRes = await provider.upload('videos/intro.mp4', Buffer.from('video-stream'), 'video/mp4');
  assert.equal(uploadRes.key, 'videos/intro.mp4');
  assert.equal(uploadRes.url, 'https://cdn.skillyards.com/videos/intro.mp4');

  const signedUrl = await provider.getSignedUrl('videos/intro.mp4', 1800);
  assert.equal(signedUrl.includes('https://cdn.skillyards.com/videos/intro.mp4'), true);
  assert.equal(signedUrl.includes('X-Amz-Expires=1800'), true);
});
