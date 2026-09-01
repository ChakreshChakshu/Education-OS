const { BaseRepository } = require('./BaseRepository');
const { studentProgressTable } = require('../schema/learning.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleStudentProgressRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = studentProgressTable;
    this._progressStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { StudentProgress } = require('../domain-learning-bridge');

    const res = StudentProgress.create(
      {
        studentUserId: row.studentUserId || row.student_user_id,
        batchId: row.batchId || row.batch_id,
        lessonModuleId: row.lessonModuleId || row.lesson_module_id,
        status: row.status,
        completedAt: row.completedAt || row.completed_at,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return res.isSuccess ? res.getValue() : null;
  }

  static toPersistence(progress) {
    return {
      id: progress.id,
      studentUserId: progress.studentUserId,
      batchId: progress.batchId,
      lessonModuleId: progress.lessonModuleId,
      status: progress.status,
      completedAt: progress.props.completedAt,
      createdAt: progress.props.createdAt,
      updatedAt: progress.props.updatedAt,
      deletedAt: progress.props.deletedAt,
      version: progress.props.version || 1
    };
  }

  async findByStudentAndModule(studentUserId, lessonModuleId) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.studentUserId, studentUserId),
            eq(this.table.lessonModuleId, lessonModuleId),
            isNull(this.table.deletedAt)
          )
        )
        .limit(1);
      return rows[0] ? DrizzleStudentProgressRepository.toDomain(rows[0]) : null;
    }

    for (const raw of this._progressStore.values()) {
      if (
        raw.studentUserId === studentUserId &&
        raw.lessonModuleId === lessonModuleId &&
        !raw.deletedAt
      ) {
        return DrizzleStudentProgressRepository.toDomain(raw);
      }
    }
    return null;
  }

  async save(progress) {
    const raw = DrizzleStudentProgressRepository.toPersistence(progress);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._progressStore.set(progress.id, raw);
    return progress;
  }
}

module.exports = { DrizzleStudentProgressRepository };
