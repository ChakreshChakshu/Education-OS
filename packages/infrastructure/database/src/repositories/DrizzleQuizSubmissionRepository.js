const { BaseRepository } = require('./BaseRepository');
const { quizSubmissionsTable } = require('../schema/learning.schema');
const { eq, and } = require('../drizzle-bridge');

class DrizzleQuizSubmissionRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = quizSubmissionsTable;
    this._submissionStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { QuizSubmission, Score } = require('../domain-learning-bridge');

    const scoreRes = Score.create(row.score);
    if (scoreRes.isFailure) return null;

    const res = QuizSubmission.create(
      {
        studentUserId: row.studentUserId || row.student_user_id,
        lessonModuleId: row.lessonModuleId || row.lesson_module_id,
        score: scoreRes.getValue(),
        passed: row.passed,
        submittedAt: row.submittedAt || row.submitted_at,
        createdAt: row.createdAt || row.created_at
      },
      row.id
    );

    return res.isSuccess ? res.getValue() : null;
  }

  static toPersistence(submission) {
    return {
      id: submission.id,
      studentUserId: submission.studentUserId,
      lessonModuleId: submission.lessonModuleId,
      score: submission.score.value,
      passed: submission.passed,
      submittedAt: submission.props.submittedAt,
      createdAt: submission.props.createdAt
    };
  }

  async findById(id) {
    if (this.db && this.db.select) {
      const rows = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
      return rows[0] ? DrizzleQuizSubmissionRepository.toDomain(rows[0]) : null;
    }
    const raw = this._submissionStore.get(id);
    return raw ? DrizzleQuizSubmissionRepository.toDomain(raw) : null;
  }

  async save(submission) {
    const raw = DrizzleQuizSubmissionRepository.toPersistence(submission);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._submissionStore.set(submission.id, raw);
    return submission;
  }
}

module.exports = { DrizzleQuizSubmissionRepository };
