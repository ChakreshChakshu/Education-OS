const path = require('path');
const fs = require('fs');
const os = require('node:os');
const { JOBS } = require('../jobs');
const { VideoTranscoder } = require('../services/transcoder');

let DatabaseClient, R2StorageProvider, ResendMailProvider;
try {
  DatabaseClient = require('@eos/infra-database').DatabaseClient;
} catch (e) {
  DatabaseClient = require('../../../../packages/infrastructure/database/src').DatabaseClient;
}

try {
  R2StorageProvider = require('@eos/infra-storage').R2StorageProvider;
} catch (e) {
  R2StorageProvider = require('../../../../packages/infrastructure/storage/src').R2StorageProvider;
}

try {
  ResendMailProvider = require('@eos/infra-mail').ResendMailProvider;
} catch (e) {
  ResendMailProvider = require('../../../../packages/infrastructure/mail/src').ResendMailProvider;
}

const transcoder = new VideoTranscoder();
const mailProvider = new ResendMailProvider();

async function uploadDirectoryToR2(r2Provider, localDir, r2Prefix) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(localDir, entry.name);
    const targetKey = `${r2Prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await uploadDirectoryToR2(r2Provider, fullPath, targetKey);
    } else {
      let mime = 'application/octet-stream';
      if (entry.name.endsWith('.m3u8')) mime = 'application/vnd.apple.mpegurl';
      else if (entry.name.endsWith('.ts')) mime = 'video/mp2t';
      else if (entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg')) mime = 'image/jpeg';
      else if (entry.name.endsWith('.mp4')) mime = 'video/mp4';

      const buffer = fs.readFileSync(fullPath);
      await r2Provider.upload(targetKey, buffer, mime);
    }
  }
}

function resolveInputVideoPath(storageKey, uploadPath) {
  const uploadRoots = [
    path.resolve(__dirname, '../../../api/uploads'),
    path.resolve('uploads'),
    path.join(os.tmpdir(), 'eos_uploads')
  ];

  for (const root of uploadRoots) {
    const candidate = path.resolve(root, storageKey);
    if (!candidate.startsWith(root + path.sep)) continue;
    if (root === uploadRoots[2] && candidate !== uploadPath) continue;
    try {
      const realRoot = fs.realpathSync(root);
      const realFile = fs.realpathSync(candidate);
      if (realFile.startsWith(realRoot + path.sep) && fs.statSync(realFile).isFile()) {
        return realFile;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return null;
}

const PROCESSORS = {
  [JOBS.VIDEO_TRANSCODE]: async (payload, job) => {
    const mediaAssetId = payload.mediaAssetId || payload.id;
    console.log(`[Processor:video.transcode] Processing mediaAssetId=${mediaAssetId}, filename=${payload.filename}`);

    if (!mediaAssetId) {
      throw new Error('[video.transcode] Missing mediaAssetId in job payload.');
    }

    const hasR2 = Boolean(process.env.R2_ACCOUNT_ID || process.env.R2_BUCKET_NAME || process.env.R2_PRIVATE_BUCKET_NAME);
    const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME;
    if (hasR2 && (!privateBucket ||
      (privateBucket === process.env.R2_BUCKET_NAME && (process.env.R2_PUBLIC_DOMAIN || process.env.MEDIA_CDN_URL)))) {
      throw new Error('Configure R2_PRIVATE_BUCKET_NAME for private transcodes.');
    }
    const privateStorage = hasR2 ? new R2StorageProvider({ bucketName: privateBucket, privateUrls: true }) : null;

    const dbClient = new DatabaseClient({ connectionString: process.env.DATABASE_URL });
    let assetRow;
    try {
      const { rows } = await dbClient.query(
        'SELECT tenant_id, storage_key, storage_url FROM media_assets WHERE id = $1 AND deleted_at IS NULL',
        [mediaAssetId]
      );
      assetRow = rows[0];
    } finally {
      await dbClient.disconnect();
    }
    if (!assetRow?.storage_key || (payload.tenantId && payload.tenantId !== assetRow.tenant_id)) {
      throw new Error('[video.transcode] Media asset not found for this tenant.');
    }

    const scratchDir = path.resolve('scratch');
    fs.mkdirSync(scratchDir, { recursive: true });
    const tempWorkDir = fs.mkdtempSync(path.join(scratchDir, `transcode_${mediaAssetId}_`));

    try {
      let inputPath = resolveInputVideoPath(assetRow.storage_key, payload.filePath);
      if (!inputPath && privateStorage) {
        const sourceStorage = assetRow.storage_key.startsWith('private/') ? privateStorage : new R2StorageProvider();
        const buffer = await sourceStorage.download(assetRow.storage_key);
        if (buffer?.length) {
          inputPath = path.join(tempWorkDir, `source_${path.basename(assetRow.storage_key)}`);
          fs.writeFileSync(inputPath, buffer);
        }
      }
      if (!inputPath) {
        throw new Error('[video.transcode] Source video not found.');
      }

      // 4. Prepare HLS output directory
      const hlsOutputDir = path.join(tempWorkDir, 'hls');
      if (!fs.existsSync(hlsOutputDir)) fs.mkdirSync(hlsOutputDir, { recursive: true });

      // 5. Execute Multi-bitrate HLS Transcoding via FFmpeg
      console.log(`[video.transcode] Starting FFmpeg HLS encoding into: ${hlsOutputDir}`);
      const transcodeResult = await transcoder.transcodeHLS(inputPath, hlsOutputDir, {
        segmentDuration: 4
      });

      const manifestUrl = `/uploads/hls/${mediaAssetId}/master.m3u8`;
      if (privateStorage) {
        await uploadDirectoryToR2(privateStorage, hlsOutputDir, `private/hls/${mediaAssetId}`);
      }

      // Mirror to API local uploads folder as local fallback
      try {
        const apiUploadsDir = path.resolve(__dirname, '../../../api/uploads/hls', mediaAssetId);
        if (!fs.existsSync(apiUploadsDir)) fs.mkdirSync(apiUploadsDir, { recursive: true });
        fs.cpSync(hlsOutputDir, apiUploadsDir, { recursive: true });
      } catch (mirrorErr) {
        if (!privateStorage) throw mirrorErr;
      }

      // Match direct uploads by their recorded URL. Explicit module links still require an owned course.
      try {
        await dbClient.query(
          `WITH updated_asset AS (
             UPDATE media_assets
             SET status = 'READY', hls_manifest_url = $1, updated_at = NOW()
             WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
             RETURNING tenant_id, storage_url
           )
           UPDATE lesson_modules AS lesson
           SET content_url = $1, updated_at = NOW()
           FROM courses AS course, updated_asset AS asset
           WHERE lesson.course_id = course.id AND course.tenant_id = asset.tenant_id
             AND course.deleted_at IS NULL AND lesson.deleted_at IS NULL
             AND (lesson.content_type = 'VIDEO' OR lesson.content_type IS NULL)
             AND (
               ($4::uuid IS NOT NULL AND lesson.id = $4)
               OR ($4::uuid IS NULL AND NULLIF(asset.storage_url, '') = lesson.content_url)
             )`,
          [manifestUrl, mediaAssetId, assetRow.tenant_id, payload.moduleId || null]
        );
      } finally {
        await dbClient.disconnect();
      }

      return {
        success: true,
        mediaAssetId,
        manifestUrl,
        variants: transcodeResult.variants.map((v) => v.resolution)
      };
    } finally {
      fs.rmSync(tempWorkDir, { recursive: true, force: true });
    }
  },

  [JOBS.EMAIL_SEND]: async (payload, job) => {
    const to = payload.to;
    const template = payload.template || 'welcome';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    let subject = payload.subject;
    let html = '';
    let text = '';

    if (template === 'student_invitation') {
      subject = subject || `Course Invitation: ${payload.courseTitle || 'Curriculum Course'}`;
      const activationLink = payload.activationUrl
        ? new URL(payload.activationUrl, appUrl).href
        : new URL('/login', appUrl).href;
      const action = payload.activationUrl ? 'Activate your account' : 'Sign in';

      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="margin-bottom: 24px; text-align: center;">
            <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;">EDUCATION OS</div>
          </div>
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; text-align: center;">You have been enrolled in a course!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
            Hello <strong>${payload.name || 'Student'}</strong>,<br/>
            You have been enrolled in <strong>${payload.courseTitle || 'your academic curriculum'}</strong>${payload.courseCode ? ` (${payload.courseCode})` : ''}.
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${activationLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
              ${action}
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center; margin-bottom: 0;">
            ${payload.activationUrl ? "This activation link is valid for 7 days." : ""} If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `;
      text = `Hello ${payload.name || 'Student'},\n\nYou have been enrolled in ${payload.courseTitle || 'your course'}.\n\n${action}: ${activationLink}`;
    } else if (template === 'password_reset') {
      subject = subject || 'Reset Your EducationOS Password';
      const resetLink = payload.resetUrl || (payload.token ? `${appUrl}/reset-password?token=${payload.token}` : `${appUrl}/forgot-password`);
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background-color: #ffffff; color: #1e293b; border-radius: 16px; border: 1px solid #e2e8f0;">
          <div style="margin-bottom: 24px; text-align: center;">
            <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 8px 18px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 0.5px;">EDUCATION OS</div>
          </div>
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; text-align: center;">Password Reset Request</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            Hello <strong>${payload.name || 'User'}</strong>,<br/><br/>
            We received a request to reset the password for your EducationOS account. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 4px 0 rgba(37, 99, 235, 0.2);">
              Reset Your Password
            </a>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 20px;">
            If the button above does not work, copy and paste this link into your browser:
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #2563eb; font-family: monospace; margin-bottom: 28px;">
            ${resetLink}
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0;">
              This link is valid for <strong>1 hour</strong>. If you did not request this password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
        </div>
      `;
      text = `Hello ${payload.name || 'User'},\n\nWe received a request to reset your password for EducationOS.\nPlease use the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nEducationOS Team`;
    } else {
      subject = subject || 'Welcome to Education Operating System';
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 12px;">Welcome to EducationOS, ${payload.name || 'User'}!</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">Your multi-tenant academic portal account is ready. Access the campus dashboard below:</p>
          <div style="margin: 24px 0;">
            <a href="${appUrl}/dashboard" style="background: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">Open Dashboard</a>
          </div>
        </div>
      `;
      text = `Welcome to EducationOS, ${payload.name || 'User'}!\n\nOpen your dashboard: ${appUrl}/dashboard`;
    }

    const result = await mailProvider.sendMail({
      to,
      subject,
      html,
      text
    });

    console.log(`[Processor:email.send] Dispatched email to ${to} (id: ${result.id}, mock: ${!!result.mock})`);
    return { success: true, emailId: result.id, mock: !!result.mock };
  },

  [JOBS.BILLING_RECURRING]: async (payload, job) => {
    console.log(`[Processor:billing.recurring] Processing recurring billing for tenant ${payload.tenantId}`);
    return { success: true };
  }
};

module.exports = { PROCESSORS };
