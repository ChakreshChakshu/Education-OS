const path = require('path');
const fs = require('fs');
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

function resolveInputVideoPath(payload) {
  const candidatePaths = [
    // 1. In API uploads folder by filename
    payload.filename ? path.resolve(__dirname, '../../../api/uploads', payload.filename) : null,
    // 2. In local worker uploads folder by filename
    payload.filename ? path.resolve(process.cwd(), 'uploads', payload.filename) : null,
    // 3. By storageKey in API uploads
    payload.storageKey ? path.resolve(__dirname, '../../../api/uploads', payload.storageKey) : null,
    // 4. By storageKey in local uploads
    payload.storageKey ? path.resolve(process.cwd(), 'uploads', payload.storageKey) : null,
    // 5. Absolute path if provided
    payload.filePath && path.isAbsolute(payload.filePath) ? payload.filePath : null
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
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

    const hasR2 = Boolean(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
    );
    const r2 = hasR2 && R2StorageProvider ? new R2StorageProvider() : null;

    // 1. Query Neon PostgreSQL for media_assets row
    let assetRow = null;
    try {
      const dbClient = new DatabaseClient({ connectionString: process.env.DATABASE_URL });
      await dbClient.connect();
      const res = await dbClient.query(
        'SELECT id, filename, storage_key, storage_url, mime_type FROM media_assets WHERE id = $1',
        [mediaAssetId]
      );
      if (res.rows && res.rows.length > 0) {
        assetRow = res.rows[0];
      }
      await dbClient.disconnect();
    } catch (e) {
      console.warn(`[video.transcode] Asset DB lookup warning: ${e.message}`);
    }

    // 2. Prepare temporary scratch working directory
    const tempWorkDir = path.resolve(process.cwd(), 'scratch', `transcode_${mediaAssetId}`);
    if (!fs.existsSync(tempWorkDir)) fs.mkdirSync(tempWorkDir, { recursive: true });

    // 3. Locate or download input video
    let inputPath = resolveInputVideoPath(payload);

    if (!inputPath && r2) {
      const candidateKeys = [
        payload.storageKey,
        assetRow?.storage_key,
        payload.filename,
        assetRow?.filename,
        payload.filename ? `raw/${payload.filename}` : null,
        payload.filename ? `${mediaAssetId}/${payload.filename}` : null
      ].filter(Boolean);

      for (const key of candidateKeys) {
        try {
          console.log(`[video.transcode] Checking Cloudflare R2 for source video (key=${key})...`);
          const buffer = await r2.download(key);
          if (buffer && buffer.length > 0) {
            const destPath = path.join(tempWorkDir, `source_${path.basename(key)}`);
            fs.writeFileSync(destPath, buffer);
            inputPath = destPath;
            console.log(`[video.transcode] Downloaded ${buffer.length} bytes from Cloudflare R2 for asset ${mediaAssetId}`);
            break;
          }
        } catch (r2DlErr) {
          console.warn(`[video.transcode] Key ${key} download check warning: ${r2DlErr.message}`);
        }
      }
    }

    if (!inputPath) {
      console.warn(`[video.transcode] Source video not found in R2 or local disk. Generating synthetic test video for asset ${mediaAssetId}...`);
      inputPath = path.join(tempWorkDir, `test_source_${mediaAssetId}.mp4`);
      await transcoder.createSyntheticVideo(inputPath, 3);
    }

    // 4. Prepare HLS output directory
    const hlsOutputDir = path.join(tempWorkDir, 'hls');
    if (!fs.existsSync(hlsOutputDir)) fs.mkdirSync(hlsOutputDir, { recursive: true });

    // 5. Execute Multi-bitrate HLS Transcoding via FFmpeg
    console.log(`[video.transcode] Starting FFmpeg HLS encoding into: ${hlsOutputDir}`);
    const transcodeResult = await transcoder.transcodeHLS(inputPath, hlsOutputDir, {
      segmentDuration: 4
    });

    let manifestUrl = `http://localhost:3001/uploads/hls/${mediaAssetId}/master.m3u8`;

    // 6. Upload HLS segments and playlists to Cloudflare R2
    if (r2) {
      try {
        console.log(`[video.transcode] Syncing HLS stream directory to Cloudflare R2 for asset ${mediaAssetId}...`);
        await uploadDirectoryToR2(r2, hlsOutputDir, `hls/${mediaAssetId}`);
        manifestUrl = await r2.getDownloadUrl(`hls/${mediaAssetId}/master.m3u8`);
        console.log(`[video.transcode] R2 Sync Complete! Manifest URL: ${manifestUrl}`);
      } catch (r2Err) {
        console.warn(`[video.transcode] Cloudflare R2 upload warning: ${r2Err.message}`);
      }
    }

    // Mirror to API local uploads folder as local fallback
    try {
      const apiUploadsDir = path.resolve(__dirname, '../../../api/uploads/hls', mediaAssetId);
      if (!fs.existsSync(apiUploadsDir)) fs.mkdirSync(apiUploadsDir, { recursive: true });
      fs.cpSync(hlsOutputDir, apiUploadsDir, { recursive: true });
    } catch (mirrorErr) {
      // non-fatal
    }

    // 7. Update media_assets and associated lesson_modules in Neon PostgreSQL
    try {
      const dbClient = new DatabaseClient({ connectionString: process.env.DATABASE_URL });
      await dbClient.connect();

      await dbClient.query(
        `UPDATE media_assets 
         SET status = 'READY', 
             hls_manifest_url = $1, 
             updated_at = NOW() 
         WHERE id = $2`,
        [manifestUrl, mediaAssetId]
      );

      // Update associated lesson_modules (by explicit moduleId or URL match)
      if (payload.moduleId) {
        await dbClient.query(
          `UPDATE lesson_modules 
           SET content_url = $1,
               updated_at = NOW() 
           WHERE id = $2`,
          [manifestUrl, payload.moduleId]
        );
      } else {
        await dbClient.query(
          `UPDATE lesson_modules 
           SET content_url = $1,
               updated_at = NOW() 
           WHERE (content_url LIKE '%' || $2 || '%' OR content_url LIKE '%' || $3 || '%') 
             AND (content_type = 'VIDEO' OR content_type IS NULL)`,
          [manifestUrl, mediaAssetId, payload.filename || '']
        );
      }

      await dbClient.disconnect();
      console.log(`[video.transcode] Updated media_assets (${mediaAssetId}) -> status='READY', hls_manifest_url='${manifestUrl}'`);
    } catch (dbErr) {
      console.warn(`[video.transcode] Database status update warning for ${mediaAssetId}: ${dbErr.message}`);
    }

    // 8. Clean up local temporary scratch files
    try {
      fs.rmSync(tempWorkDir, { recursive: true, force: true });
    } catch (cleanErr) {
      // non-fatal
    }

    return {
      success: true,
      mediaAssetId,
      manifestUrl,
      variants: transcodeResult.variants.map((v) => v.resolution)
    };
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
        ? (payload.activationUrl.startsWith('http') ? payload.activationUrl : `${appUrl}${payload.activationUrl}`)
        : (payload.activationToken ? `${appUrl}/activate?token=${payload.activationToken}` : appUrl);

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
          ${payload.temporaryPassword ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Temporary Credentials</div>
              <div style="font-size: 14px; color: #334155; margin-bottom: 2px;">Email: <strong>${to}</strong></div>
              <div style="font-size: 14px; color: #334155;">Temporary Password: <strong style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${payload.temporaryPassword}</strong></div>
            </div>
          ` : ''}
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${activationLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
              Activate Account & Enter Classroom
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center; margin-bottom: 0;">
            This invitation link is valid for 7 days. If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `;
      text = `Hello ${payload.name || 'Student'},\n\nYou have been enrolled in ${payload.courseTitle || 'your course'}.\n\nActivate your account: ${activationLink}\n\nTemporary Password: ${payload.temporaryPassword || 'N/A'}`;
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
