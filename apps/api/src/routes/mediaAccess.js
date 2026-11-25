const { isUuid, getUserId } = require('../middleware/tenantScope');

function uploadUrl(key) {
  return '/uploads/' + key.split('/').map(encodeURIComponent).join('/');
}

function hlsUrl(assetId) {
  return uploadUrl(`hls/${assetId}/master.m3u8`);
}

async function findMediaAsset(db, key) {
  const parts = key.split('/');
  const isHls = parts[0] === 'hls';
  if (isHls && (parts.length < 3 || !isUuid(parts[1]))) return null;

  const { rows } = await db.query(
    `SELECT id, tenant_id, storage_key, storage_url, hls_manifest_url, mime_type
     FROM media_assets
     WHERE deleted_at IS NULL AND ${isHls ? 'id' : 'storage_key'} = $1 LIMIT 2`,
    [isHls ? parts[1] : key]
  );
  return rows.length === 1 ? rows[0] : null;
}

async function canReadMedia(container, request, asset, key) {
  const db = container.resolve('DatabaseClient');

  // Only images explicitly used as published course thumbnails are public.
  if (key === asset.storage_key && ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(asset.mime_type)) {
    const { rows } = await db.query(
      `SELECT 1 FROM courses AS c JOIN tenants AS t ON t.id = c.tenant_id
       WHERE c.thumbnail_file_id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL
         AND c.visibility = 'PUBLIC' AND c.status IN ('PUBLISHED', 'ACTIVE')
         AND t.deleted_at IS NULL AND t.status = 'ACTIVE' LIMIT 1`,
      [asset.id, asset.tenant_id]
    );
    if (rows.length) return true;
  }

  const bearer = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  const token = request.cookies?.access_token || bearer;
  const user = token && container.resolve('TokenService').verifyToken(token);
  const userId = user?.type === undefined && getUserId({ user });
  if (!isUuid(userId)) return false;

  const { rows: active } = await db.query(
    `SELECT 1 FROM users AS u JOIN tenants AS t ON t.id = $2
     WHERE u.id = $1 AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
       AND t.status = 'ACTIVE' AND t.deleted_at IS NULL`,
    [userId, asset.tenant_id]
  );
  if (!active.length) return false;

  const roles = container.resolve('RoleAssignmentRepository');
  const permissions = { userId, tenantId: asset.tenant_id };
  if (await roles.hasPermission({ ...permissions, permissionKey: 'media.upload' })) return true;

  const urls = [...new Set([asset.storage_url, asset.hls_manifest_url,
    asset.storage_key && uploadUrl(asset.storage_key), hlsUrl(asset.id)].filter(Boolean))];
  const { rows } = await db.query(
    `SELECT DISTINCT c.organization_id, (e.student_user_id IS NOT NULL) AS enrolled
     FROM lesson_modules AS l
     JOIN courses AS c ON c.id = l.course_id
     LEFT JOIN enrollments AS e ON e.course_id = c.id AND e.tenant_id = c.tenant_id
       AND e.student_user_id = $2 AND e.status = 'ACTIVE'
     WHERE c.tenant_id = $1 AND c.deleted_at IS NULL AND l.deleted_at IS NULL
       AND (l.content_url = ANY($3::text[]) OR
            (l.content_type = 'ASSIGNMENT' AND l.quiz_json::jsonb ->> 'templatePdfUrl' = ANY($3::text[])))`,
    [asset.tenant_id, userId, urls]
  );
  for (const row of rows) {
    const scoped = { ...permissions, organizationId: row.organization_id };
    if (row.enrolled && await roles.hasPermission({ ...scoped, permissionKey: 'lesson.read' })) return true;
    if (row.organization_id && await roles.hasPermission({ ...scoped, permissionKey: 'lesson.publish' })) return true;
  }
  return false;
}

async function mediaUrlsForCourse(db, tenantId, urls) {
  if (!urls.length) return new Map();
  const { rows } = await db.query(
    `SELECT id, storage_key, storage_url, hls_manifest_url FROM media_assets
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND (storage_url = ANY($2::text[]) OR hls_manifest_url = ANY($2::text[]))`,
    [tenantId, urls]
  );
  const replacements = new Map();
  for (const row of rows) {
    if (row.storage_url && row.storage_key) replacements.set(row.storage_url, uploadUrl(row.storage_key));
    if (row.hls_manifest_url) replacements.set(row.hls_manifest_url, hlsUrl(row.id));
  }
  return replacements;
}

module.exports = { canReadMedia, findMediaAsset, hlsUrl, mediaUrlsForCourse, uploadUrl };
