const { BaseRepository } = require('./BaseRepository');
const { lessonBookmarksTable } = require('../schema/learning.schema');
const { eq, and, asc } = require('../drizzle-bridge');

class DrizzleLessonBookmarkRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = lessonBookmarksTable;
    this._bookmarkStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { LessonBookmark } = require('../domain-learning-bridge');

    const res = LessonBookmark.create(
      {
        studentUserId: row.studentUserId || row.student_user_id,
        lessonModuleId: row.lessonModuleId || row.lesson_module_id,
        timestampSeconds: row.timestampSeconds !== undefined ? row.timestampSeconds : row.timestamp_seconds,
        title: row.title,
        note: row.note,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at
      },
      row.id
    );

    return res.isSuccess ? res.getValue() : null;
  }

  static toPersistence(bookmark) {
    return {
      id: bookmark.id,
      studentUserId: bookmark.studentUserId,
      lessonModuleId: bookmark.lessonModuleId,
      timestampSeconds: bookmark.timestampSeconds,
      title: bookmark.title,
      note: bookmark.note,
      createdAt: bookmark.props?.createdAt || new Date(),
      updatedAt: bookmark.props?.updatedAt || new Date()
    };
  }

  async findByLessonAndStudent(lessonModuleId, studentUserId) {
    if (!this.db) {
      const results = [];
      for (const raw of this._bookmarkStore.values()) {
        if (raw.studentUserId === studentUserId && raw.lessonModuleId === lessonModuleId) {
          const domain = DrizzleLessonBookmarkRepository.toDomain(raw);
          if (domain) results.push(domain);
        }
      }
      return results.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.studentUserId, studentUserId),
            eq(this.table.lessonModuleId, lessonModuleId)
          )
        )
        .orderBy(asc(this.table.timestampSeconds));
      return (rows || []).map(DrizzleLessonBookmarkRepository.toDomain).filter(Boolean);
    }

    const res = await db.query(
      'SELECT * FROM lesson_bookmarks WHERE student_user_id = $1 AND lesson_module_id = $2 ORDER BY timestamp_seconds ASC',
      [studentUserId, lessonModuleId]
    );
    return (res.rows || []).map(DrizzleLessonBookmarkRepository.toDomain).filter(Boolean);
  }

  async save(bookmark) {
    const raw = DrizzleLessonBookmarkRepository.toPersistence(bookmark);
    this._bookmarkStore.set(bookmark.id, raw);

    if (!this.db) {
      return bookmark;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: {
          title: raw.title,
          note: raw.note,
          timestampSeconds: raw.timestampSeconds,
          updatedAt: raw.updatedAt
        }
      });
    } else {
      await db.query(`
        INSERT INTO lesson_bookmarks (id, student_user_id, lesson_module_id, timestamp_seconds, title, note, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          note = EXCLUDED.note,
          timestamp_seconds = EXCLUDED.timestamp_seconds,
          updated_at = NOW();
      `, [raw.id, raw.studentUserId, raw.lessonModuleId, raw.timestampSeconds, raw.title, raw.note, raw.createdAt, raw.updatedAt]);
    }

    return bookmark;
  }

  async delete(id, studentUserId) {
    this._bookmarkStore.delete(id);

    if (!this.db) {
      return true;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.delete) {
      await db
        .delete(this.table)
        .where(and(eq(this.table.id, id), eq(this.table.studentUserId, studentUserId)));
    } else {
      await db.query(
        'DELETE FROM lesson_bookmarks WHERE id = $1 AND student_user_id = $2',
        [id, studentUserId]
      );
    }

    return true;
  }
}

module.exports = { DrizzleLessonBookmarkRepository };
