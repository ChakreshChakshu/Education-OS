const { BaseRepository } = require('./BaseRepository');
const { lessonNotesTable } = require('../schema/learning.schema');
const { eq, and } = require('../drizzle-bridge');

class DrizzleLessonNoteRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = lessonNotesTable;
    this._noteStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { LessonNote } = require('../domain-learning-bridge');

    const res = LessonNote.create(
      {
        studentUserId: row.studentUserId || row.student_user_id,
        lessonModuleId: row.lessonModuleId || row.lesson_module_id,
        content: row.content !== undefined ? row.content : '',
        version: row.version || 1,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at
      },
      row.id
    );

    return res.isSuccess ? res.getValue() : null;
  }

  static toPersistence(note) {
    return {
      id: note.id,
      studentUserId: note.studentUserId,
      lessonModuleId: note.lessonModuleId,
      content: note.content,
      version: note.version || 1,
      createdAt: note.props?.createdAt || new Date(),
      updatedAt: note.props?.updatedAt || new Date()
    };
  }

  async findByStudentAndLesson(studentUserId, lessonModuleId) {
    if (!this.db) {
      for (const raw of this._noteStore.values()) {
        if (raw.studentUserId === studentUserId && raw.lessonModuleId === lessonModuleId) {
          return DrizzleLessonNoteRepository.toDomain(raw);
        }
      }
      return null;
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
        .limit(1);
      return rows[0] ? DrizzleLessonNoteRepository.toDomain(rows[0]) : null;
    }

    const res = await db.query(
      'SELECT * FROM lesson_notes WHERE student_user_id = $1 AND lesson_module_id = $2 LIMIT 1',
      [studentUserId, lessonModuleId]
    );
    return res.rows[0] ? DrizzleLessonNoteRepository.toDomain(res.rows[0]) : null;
  }

  async save(note) {
    const raw = DrizzleLessonNoteRepository.toPersistence(note);
    this._noteStore.set(`${note.studentUserId}_${note.lessonModuleId}`, raw);

    if (!this.db) {
      return note;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: [this.table.studentUserId, this.table.lessonModuleId],
        set: {
          content: raw.content,
          version: raw.version,
          updatedAt: raw.updatedAt
        }
      });
    } else {
      await db.query(`
        INSERT INTO lesson_notes (id, student_user_id, lesson_module_id, content, version, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (student_user_id, lesson_module_id) DO UPDATE SET
          content = EXCLUDED.content,
          version = EXCLUDED.version,
          updated_at = NOW();
      `, [raw.id, raw.studentUserId, raw.lessonModuleId, raw.content, raw.version, raw.createdAt, raw.updatedAt]);
    }

    return note;
  }
}

module.exports = { DrizzleLessonNoteRepository };
