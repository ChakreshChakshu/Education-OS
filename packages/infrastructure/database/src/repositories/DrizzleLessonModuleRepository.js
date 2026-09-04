const { BaseRepository } = require('./BaseRepository');
const { lessonModulesTable } = require('../schema/learning.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleLessonModuleRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = lessonModulesTable;
  }

  static toDomain(row) {
    if (!row) return null;
    const { LessonModule } = require('../domain-learning-bridge');

    const res = LessonModule.create(
      {
        courseId: row.courseId || row.course_id,
        title: row.title,
        contentType: row.contentType || row.content_type,
        contentUrl: row.contentUrl || row.content_url,
        order: row.order || row.order_index || 1,
        status: row.status,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return res.isSuccess ? res.getValue() : null;
  }

  static toPersistence(module) {
    return {
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      contentType: module.contentType,
      contentUrl: module.contentUrl,
      order: module.order,
      status: module.status,
      createdAt: module.props.createdAt,
      updatedAt: module.props.updatedAt,
      deletedAt: module.props.deletedAt,
      version: module.props.version || 1
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
      return rows[0] ? DrizzleLessonModuleRepository.toDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM lesson_modules WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] ? DrizzleLessonModuleRepository.toDomain(res.rows[0]) : null;
  }

  async findByCourseId(courseId) {
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.courseId, courseId), isNull(this.table.deletedAt)));
      return rows.map((r) => DrizzleLessonModuleRepository.toDomain(r)).filter(Boolean);
    }
    const res = await db.query('SELECT * FROM lesson_modules WHERE course_id = $1 ORDER BY order_index ASC', [courseId]);
    return res.rows.map((r) => DrizzleLessonModuleRepository.toDomain(r)).filter(Boolean);
  }

  async save(module) {
    const raw = DrizzleLessonModuleRepository.toPersistence(module);
    const db = await this.db.connect();
    if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    } else {
      await db.query(`
        INSERT INTO lesson_modules (id, course_id, title, content_type, content_url, order_index, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content_type = EXCLUDED.content_type,
          content_url = EXCLUDED.content_url,
          updated_at = NOW();
      `, [raw.id, raw.courseId, raw.title, raw.contentType, raw.contentUrl, raw.order || 1, raw.status, raw.createdAt, raw.updatedAt]);
    }
    return module;
  }
}

module.exports = { DrizzleLessonModuleRepository };
