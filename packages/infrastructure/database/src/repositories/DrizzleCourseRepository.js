const { BaseRepository } = require('./BaseRepository');
const { coursesTable } = require('../schema/academics.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleCourseRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = coursesTable;
    this._courseStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { Course, CourseCode } = require('../domain-academics-bridge');

    const codeRes = CourseCode.create(row.code);
    if (codeRes.isFailure) return null;

    const courseRes = Course.create(
      {
        tenantId: row.tenantId || row.tenant_id,
        organizationId: row.organizationId || row.organization_id || null,
        title: row.title,
        code: codeRes.getValue(),
        slug: row.slug,
        shortDescription: row.shortDescription || row.short_description || '',
        description: row.description || '',
        thumbnailFileId: row.thumbnailFileId || row.thumbnail_file_id || null,
        thumbnailUrl: row.thumbnailUrl || row.thumbnail_url || row.storage_url || null,
        level: row.level || 'ALL_LEVELS',
        language: row.language || 'en',
        visibility: row.visibility || 'PUBLIC',
        credits: row.credits !== undefined ? row.credits : 3,
        status: row.status || 'DRAFT',
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return courseRes.isSuccess ? courseRes.getValue() : null;
  }

  static toPersistence(course) {
    return {
      id: course.id,
      tenantId: course.tenantId,
      organizationId: course.organizationId || null,
      title: course.title,
      code: course.code.value,
      slug: course.slug || null,
      shortDescription: course.shortDescription || null,
      description: course.description || null,
      thumbnailFileId: course.thumbnailFileId || null,
      level: course.level || 'ALL_LEVELS',
      language: course.language || 'en',
      visibility: course.visibility || 'PUBLIC',
      credits: course.credits || 3,
      status: course.status,
      createdAt: course.props.createdAt,
      updatedAt: course.props.updatedAt,
      deletedAt: course.props.deletedAt || null,
      version: course.props.version || 1
    };
  }

  async findById(id) {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;

    if (!this.db) {
      const raw = this._courseStore.get(id);
      return raw ? DrizzleCourseRepository.toDomain(raw) : null;
    }
    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.query) {
      const res = await db.query(`
        SELECT c.*, m.storage_url as thumbnail_url
        FROM courses c
        LEFT JOIN media_assets m ON c.thumbnail_file_id = m.id
        WHERE c.id = $1 AND c.deleted_at IS NULL
        LIMIT 1
      `, [id]);
      return res.rows[0] ? DrizzleCourseRepository.toDomain(res.rows[0]) : null;
    }
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleCourseRepository.toDomain(rows[0]) : null;
    }
    return null;
  }

  async findByCode(tenantId, codeStr) {
    const upperCode = codeStr.toUpperCase();
    if (!this.db) {
      for (const raw of this._courseStore.values()) {
        if (raw.tenantId === tenantId && raw.code?.toUpperCase() === upperCode && !raw.deletedAt) {
          return DrizzleCourseRepository.toDomain(raw);
        }
      }
      return null;
    }
    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.query) {
      const res = await db.query(`
        SELECT c.*, m.storage_url as thumbnail_url
        FROM courses c
        LEFT JOIN media_assets m ON c.thumbnail_file_id = m.id
        WHERE c.tenant_id = $1 AND UPPER(c.code) = $2 AND c.deleted_at IS NULL
        LIMIT 1
      `, [tenantId, upperCode]);
      return res.rows[0] ? DrizzleCourseRepository.toDomain(res.rows[0]) : null;
    }
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.tenantId, tenantId),
            eq(this.table.code, upperCode),
            isNull(this.table.deletedAt)
          )
        )
        .limit(1);
      return rows[0] ? DrizzleCourseRepository.toDomain(rows[0]) : null;
    }
    return null;
  }

  async findByTenantId(tenantId) {
    if (!this.db) {
      const results = [];
      for (const raw of this._courseStore.values()) {
        if ((!tenantId || raw.tenantId === tenantId) && !raw.deletedAt) {
          results.push(DrizzleCourseRepository.toDomain(raw));
        }
      }
      return results.filter(Boolean);
    }
    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.query) {
      const queryStr = tenantId 
        ? `SELECT c.*, m.storage_url as thumbnail_url
           FROM courses c
           LEFT JOIN media_assets m ON c.thumbnail_file_id = m.id
           WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
           ORDER BY c.created_at DESC`
        : `SELECT c.*, m.storage_url as thumbnail_url
           FROM courses c
           LEFT JOIN media_assets m ON c.thumbnail_file_id = m.id
           WHERE c.deleted_at IS NULL
           ORDER BY c.created_at DESC`;
      const params = tenantId ? [tenantId] : [];
      const res = await db.query(queryStr, params);
      return res.rows.map(r => DrizzleCourseRepository.toDomain(r)).filter(Boolean);
    }
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(
          tenantId
            ? and(eq(this.table.tenantId, tenantId), isNull(this.table.deletedAt))
            : isNull(this.table.deletedAt)
        );
      return rows.map(r => DrizzleCourseRepository.toDomain(r)).filter(Boolean);
    }
    return [];
  }

  async save(course) {
    const raw = DrizzleCourseRepository.toPersistence(course);
    this._courseStore.set(course.id, raw);
    if (!this.db) {
      return course;
    }
    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.query) {
      await db.query(`
        INSERT INTO courses (
          id, tenant_id, organization_id, code, title, slug, short_description,
          description, thumbnail_file_id, level, language, visibility, credits,
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          code = EXCLUDED.code,
          slug = EXCLUDED.slug,
          short_description = EXCLUDED.short_description,
          description = EXCLUDED.description,
          thumbnail_file_id = EXCLUDED.thumbnail_file_id,
          level = EXCLUDED.level,
          language = EXCLUDED.language,
          visibility = EXCLUDED.visibility,
          credits = EXCLUDED.credits,
          status = EXCLUDED.status,
          updated_at = NOW();
      `, [
        raw.id,
        raw.tenantId,
        raw.organizationId,
        raw.code,
        raw.title,
        raw.slug,
        raw.shortDescription,
        raw.description,
        raw.thumbnailFileId,
        raw.level,
        raw.language,
        raw.visibility,
        raw.credits,
        raw.status,
        raw.createdAt,
        raw.updatedAt
      ]);
    } else if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    return course;
  }
}

module.exports = { DrizzleCourseRepository };
