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
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleCourseRepository.toDomain(rows[0]) : null;
    }
    const raw = this._courseStore.get(id);
    return raw ? DrizzleCourseRepository.toDomain(raw) : null;
  }

  async findByCode(tenantId, codeStr) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.tenantId, tenantId),
            eq(this.table.code, codeStr.toUpperCase()),
            isNull(this.table.deletedAt)
          )
        )
        .limit(1);
      return rows[0] ? DrizzleCourseRepository.toDomain(rows[0]) : null;
    }
    const upperCode = codeStr.toUpperCase();
    for (const raw of this._courseStore.values()) {
      if (raw.tenantId === tenantId && raw.code.toUpperCase() === upperCode && !raw.deletedAt) {
        return DrizzleCourseRepository.toDomain(raw);
      }
    }
    return null;
  }

  async save(course) {
    const raw = DrizzleCourseRepository.toPersistence(course);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._courseStore.set(course.id, raw);
    return course;
  }
}

module.exports = { DrizzleCourseRepository };
