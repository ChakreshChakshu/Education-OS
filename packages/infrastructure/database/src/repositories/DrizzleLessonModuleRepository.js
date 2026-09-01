const { BaseRepository } = require('./BaseRepository');
const { lessonModulesTable } = require('../schema/learning.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleLessonModuleRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = lessonModulesTable;
    this._moduleStore = new Map();
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
        order: row.order,
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
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleLessonModuleRepository.toDomain(rows[0]) : null;
    }
    const raw = this._moduleStore.get(id);
    return raw ? DrizzleLessonModuleRepository.toDomain(raw) : null;
  }

  async findByCourseId(courseId) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.courseId, courseId), isNull(this.table.deletedAt)));
      return rows.map((r) => DrizzleLessonModuleRepository.toDomain(r)).filter(Boolean);
    }
    const results = [];
    for (const raw of this._moduleStore.values()) {
      if (raw.courseId === courseId && !raw.deletedAt) {
        const dom = DrizzleLessonModuleRepository.toDomain(raw);
        if (dom) results.push(dom);
      }
    }
    return results;
  }

  async save(module) {
    const raw = DrizzleLessonModuleRepository.toPersistence(module);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._moduleStore.set(module.id, raw);
    return module;
  }
}

module.exports = { DrizzleLessonModuleRepository };
