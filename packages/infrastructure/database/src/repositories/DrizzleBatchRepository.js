const { BaseRepository } = require('./BaseRepository');
const { batchesTable } = require('../schema/academics.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleBatchRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = batchesTable;
    this._batchStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { Batch, AcademicTerm } = require('../domain-academics-bridge');

    let termVo = null;
    if (row.term) {
      const termRes = AcademicTerm.create(row.term);
      if (termRes.isSuccess) termVo = termRes.getValue();
    }

    const batchRes = Batch.create(
      {
        courseId: row.courseId || row.course_id,
        name: row.name,
        term: termVo,
        capacity: row.capacity,
        instructorUserId: row.instructorUserId || row.instructor_user_id,
        startDate: row.startDate || row.start_date,
        endDate: row.endDate || row.end_date,
        status: row.status,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return batchRes.isSuccess ? batchRes.getValue() : null;
  }

  static toPersistence(batch) {
    return {
      id: batch.id,
      courseId: batch.courseId,
      name: batch.name,
      term: batch.term ? batch.term.value : null,
      capacity: batch.capacity,
      instructorUserId: batch.instructorUserId,
      startDate: batch.props.startDate,
      endDate: batch.props.endDate,
      status: batch.status,
      createdAt: batch.props.createdAt,
      updatedAt: batch.props.updatedAt,
      deletedAt: batch.props.deletedAt,
      version: batch.props.version || 1
    };
  }

  async findById(id) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleBatchRepository.toDomain(rows[0]) : null;
    }
    const raw = this._batchStore.get(id);
    return raw ? DrizzleBatchRepository.toDomain(raw) : null;
  }

  async findByCourseId(courseId) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.courseId, courseId), isNull(this.table.deletedAt)));
      return rows.map((r) => DrizzleBatchRepository.toDomain(r)).filter(Boolean);
    }
    const results = [];
    for (const raw of this._batchStore.values()) {
      if (raw.courseId === courseId && !raw.deletedAt) {
        const dom = DrizzleBatchRepository.toDomain(raw);
        if (dom) results.push(dom);
      }
    }
    return results;
  }

  async save(batch) {
    const raw = DrizzleBatchRepository.toPersistence(batch);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._batchStore.set(batch.id, raw);
    return batch;
  }
}

module.exports = { DrizzleBatchRepository };
