const { BaseRepository } = require('./BaseRepository');
const { coursesTable } = require('../schema/academics.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleCourseRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = coursesTable;
  }

  static toDomain(row) {
    if (!row) return null;
    const { Course, CourseCode } = require('../domain-academics-bridge');

    const codeRes = CourseCode.create(row.code);
    if (codeRes.isFailure) return null;

    const courseRes = Course.create(
      {
        tenantId: row.tenantId || row.tenant_id,
        organizationId: row.organizationId || row.organization_id,
        title: row.title,
        code: codeRes.getValue(),
        description: row.description,
        credits: row.credits,
        status: row.status,
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
      organizationId: course.organizationId,
      title: course.title,
      code: course.code.value,
      description: course.description,
      credits: course.credits,
      status: course.status,
      createdAt: course.props.createdAt,
      updatedAt: course.props.updatedAt,
      deletedAt: course.props.deletedAt,
      version: course.props.version || 1
    };
  }

  async findById(id) {
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleCourseRepository.toDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM courses WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
    return res.rows[0] ? DrizzleCourseRepository.toDomain(res.rows[0]) : null;
  }

  async findByCode(tenantId, codeStr) {
    const upperCode = codeStr.toUpperCase();
    const db = await this.db.connect();
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
    const res = await db.query('SELECT * FROM courses WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1', [tenantId, upperCode]);
    return res.rows[0] ? DrizzleCourseRepository.toDomain(res.rows[0]) : null;
  }

  async findByTenantId(tenantId) {
    const db = await this.db.connect();
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
    const queryStr = tenantId 
      ? 'SELECT * FROM courses WHERE tenant_id = $1 AND deleted_at IS NULL'
      : 'SELECT * FROM courses WHERE deleted_at IS NULL';
    const params = tenantId ? [tenantId] : [];
    const res = await db.query(queryStr, params);
    return res.rows.map(r => DrizzleCourseRepository.toDomain(r)).filter(Boolean);
  }

  async save(course) {
    const raw = DrizzleCourseRepository.toPersistence(course);
    const db = await this.db.connect();
    if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    } else {
      await db.query(`
        INSERT INTO courses (id, tenant_id, code, title, description, duration, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          updated_at = NOW();
      `, [raw.id, raw.tenantId, raw.code, raw.title, raw.description, '4 Weeks', raw.status, raw.createdAt, raw.updatedAt]);
    }
    return course;
  }
}

module.exports = { DrizzleCourseRepository };
