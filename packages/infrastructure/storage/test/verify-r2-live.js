const path = require('path');
const fs = require('fs');

// Simple native .env loader without external dependency
const envPath = path.resolve(__dirname, '../../../../apps/api/.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

const { R2StorageProvider } = require('../src');

async function testR2Live() {
  console.log('☁️ [R2] Testing Cloudflare R2 Live Connection...\n');

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'education-os-media';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('❌ Missing R2 credentials in apps/api/.env');
    console.log('Please set:');
    console.log('  R2_ACCOUNT_ID=...');
    console.log('  R2_ACCESS_KEY_ID=...');
    console.log('  R2_SECRET_ACCESS_KEY=...');
    console.log('  R2_BUCKET_NAME=...');
    process.exit(1);
  }

  const r2 = new R2StorageProvider();
  const testKey = `test-healthcheck-${Date.now()}.txt`;
  const testContent = Buffer.from('EducationOS R2 Cloud Storage Test Ping OK');

  console.log(`1. Uploading test file: ${testKey} to bucket: ${bucketName}...`);
  const uploadRes = await r2.upload(testKey, testContent, 'text/plain');
  console.log(`✅ Upload success! URL: ${uploadRes.url}`);

  console.log(`2. Downloading test file: ${testKey}...`);
  const downloaded = await r2.download(testKey);
  console.log(`✅ Downloaded content: "${downloaded.toString()}"`);

  console.log(`3. Generating presigned upload URL...`);
  const presigned = await r2.getSignedUrl(`presigned-${testKey}`, 300);
  console.log(`✅ Presigned URL generated: ${presigned.substring(0, 80)}...`);

  console.log(`4. Deleting test file: ${testKey}...`);
  await r2.delete(testKey);
  console.log(`✅ Cleaned up test file.`);

  console.log('\n🎉 Cloudflare R2 Connection 100% OPERATIONAL! 🚀');
}

testR2Live().catch((err) => {
  console.error('❌ R2 connection test failed:', err);
  process.exit(1);
});
