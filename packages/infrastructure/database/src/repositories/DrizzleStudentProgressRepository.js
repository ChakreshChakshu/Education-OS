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
    if (!studentUserId || !lessonModuleId) return null;
    const queryFn = this.db?.query ? this.db.query.bind(this.db) : null;
    if (queryFn) {
      const res = await queryFn(
        'SELECT * FROM student_progress WHERE student_user_id = $1 AND lesson_module_id = $2 LIMIT 1',
        [studentUserId, lessonModuleId]
      );
      return res.rows[0] ? DrizzleStudentProgressRepository.toDomain(res.rows[0]) : null;
    }

    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.studentUserId, studentUserId),
            eq(this.table.lessonModuleId, lessonModuleId)
          )
        )
        .limit(1);
      return rows[0] ? DrizzleStudentProgressRepository.toDomain(rows[0]) : null;
    }

    for (const raw of this._progressStore.values()) {
      if (
        raw.studentUserId === studentUserId &&
        raw.lessonModuleId === lessonModuleId
      ) {
        return DrizzleStudentProgressRepository.toDomain(raw);
      }
    }
    return null;
  }

  async findByStudent(studentUserId) {
    if (!studentUserId) return [];
    const queryFn = this.db?.query ? this.db.query.bind(this.db) : null;
    if (queryFn) {
      const res = await queryFn(
        'SELECT * FROM student_progress WHERE student_user_id = $1 AND status = $2',
        [studentUserId, 'COMPLETED']
      );
      return res.rows.map((r) => DrizzleStudentProgressRepository.toDomain(r)).filter(Boolean);
    }

    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.studentUserId, studentUserId),
            eq(this.table.status, 'COMPLETED')
          )
        );
      return rows.map((r) => DrizzleStudentProgressRepository.toDomain(r)).filter(Boolean);
    }

    const results = [];
    for (const raw of this._progressStore.values()) {
      if (raw.studentUserId === studentUserId && raw.status === 'COMPLETED') {
        const dom = DrizzleStudentProgressRepository.toDomain(raw);
        if (dom) results.push(dom);
      }
    }
    return results;
  }

  async save(progress) {
    const raw = DrizzleStudentProgressRepository.toPersistence(progress);
    this._progressStore.set(progress.id, raw);

    const queryFn = this.db?.query ? this.db.query.bind(this.db) : null;
    if (queryFn) {
      await queryFn(`
        INSERT INTO student_progress (id, student_user_id, batch_id, lesson_module_id, status, completed_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          completed_at = EXCLUDED.completed_at,
          updated_at = NOW();
      `, [
        raw.id,
        raw.studentUserId,
        raw.batchId || null,
        raw.lessonModuleId,
        raw.status,
        raw.completedAt || new Date(),
        raw.createdAt || new Date(),
        raw.updatedAt || new Date()
      ]);
      return progress;
    }

    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values({
        id: raw.id,
        studentUserId: raw.studentUserId,
        batchId: raw.batchId,
        lessonModuleId: raw.lessonModuleId,
        status: raw.status,
        completedAt: raw.completedAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
      }).onConflictDoUpdate({
        target: this.table.id,
        set: {
          status: raw.status,
          completedAt: raw.completedAt,
          updatedAt: new Date()
        }
      });
    }
    return progress;
  }
}

module.exports = { DrizzleStudentProgressRepository };
