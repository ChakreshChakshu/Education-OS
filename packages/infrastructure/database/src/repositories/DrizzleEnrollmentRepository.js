const { eq, and, desc, sql } = require('../drizzle-bridge');
const { enrollmentsTable } = require('../schema/academics.schema');
const { Enrollment } = require('../domain-learning-bridge');

class DrizzleEnrollmentRepository {
  constructor(db) {
    this.db = db;
    this.table = enrollmentsTable;
    this._enrollmentStore = new Map();
  }

  static toDomain(raw) {
    if (!raw) return null;
    const enrollment = new Enrollment(
      {
        id: raw.id,
        tenantId: raw.tenantId || raw.tenant_id,
        studentUserId: raw.studentUserId || raw.student_user_id,
        courseId: raw.courseId || raw.course_id,
        batchId: raw.batchId || raw.batch_id || null,
        status: raw.status || 'ACTIVE',
        progressPercentage: raw.progressPercentage !== undefined ? raw.progressPercentage : (raw.progress_percentage || 0),
        enrolledAt: raw.enrolledAt ? new Date(raw.enrolledAt) : (raw.enrolled_at ? new Date(raw.enrolled_at) : new Date()),
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : (raw.updated_at ? new Date(raw.updated_at) : new Date())
      },
      raw.id
    );

    // Attach joined metadata for UI presentation if present
    if (raw.student_name || raw.studentName) enrollment.studentName = raw.student_name || raw.studentName;
    if (raw.student_email || raw.studentEmail) enrollment.studentEmail = raw.student_email || raw.studentEmail;
    if (raw.course_title || raw.courseTitle) enrollment.courseTitle = raw.course_title || raw.courseTitle;
    if (raw.course_code || raw.courseCode) enrollment.courseCode = raw.course_code || raw.courseCode;
    if (raw.batch_name || raw.batchName) enrollment.batchName = raw.batch_name || raw.batchName;

    return enrollment;
  }

  static toPersistence(enrollment) {
    return {
      id: enrollment.id,
      tenantId: enrollment.tenantId,
      studentUserId: enrollment.studentUserId,
      courseId: enrollment.courseId,
      batchId: enrollment.batchId || null,
      status: enrollment.status,
      progressPercentage: enrollment.progressPercentage,
      enrolledAt: enrollment.enrolledAt,
      updatedAt: enrollment.updatedAt
    };
  }

  async findById(id) {
    if (this._enrollmentStore.has(id)) {
      return DrizzleEnrollmentRepository.toDomain(this._enrollmentStore.get(id));
    }

    if (!this.db) {
      return null;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    const res = await db.query(
      `SELECT e.*, 
              u.name AS student_name, 
              u.email AS student_email,
              c.title AS course_title,
              c.code AS course_code,
              b.name AS batch_name
       FROM enrollments e
       LEFT JOIN users u ON u.id = e.student_user_id
       LEFT JOIN courses c ON c.id = e.course_id
       LEFT JOIN batches b ON b.id = e.batch_id
       WHERE e.id = $1 LIMIT 1`,
      [id]
    );

    return res.rows[0] ? DrizzleEnrollmentRepository.toDomain(res.rows[0]) : null;
  }

  async findByStudentAndCourse(studentUserId, courseId) {
    for (const raw of this._enrollmentStore.values()) {
      const studentId = raw.studentUserId || raw.student_user_id;
      const cId = raw.courseId || raw.course_id;
      if (studentId === studentUserId && cId === courseId) {
        return DrizzleEnrollmentRepository.toDomain(raw);
      }
    }

    if (!this.db) {
      return null;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    const res = await db.query(
      `SELECT e.*, 
              u.name AS student_name, 
              u.email AS student_email,
              c.title AS course_title,
              c.code AS course_code,
              b.name AS batch_name
       FROM enrollments e
       LEFT JOIN users u ON u.id = e.student_user_id
       LEFT JOIN courses c ON c.id = e.course_id
       LEFT JOIN batches b ON b.id = e.batch_id
       WHERE e.student_user_id = $1 AND e.course_id = $2 LIMIT 1`,
      [studentUserId, courseId]
    );

    return res.rows[0] ? DrizzleEnrollmentRepository.toDomain(res.rows[0]) : null;
  }

  async findByTenant({ tenantId, courseId, batchId, status, search }) {
    if (!this.db) {
      const results = [];
      for (const raw of this._enrollmentStore.values()) {
        const tId = raw.tenantId || raw.tenant_id;
        if (tId === tenantId) {
          const domain = DrizzleEnrollmentRepository.toDomain(raw);
          if (domain) results.push(domain);
        }
      }
      return results;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;

    let query = `
      SELECT e.*, 
             u.name AS student_name, 
             u.email AS student_email,
             c.title AS course_title,
             c.code AS course_code,
             b.name AS batch_name
      FROM enrollments e
      LEFT JOIN users u ON u.id = e.student_user_id
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN batches b ON b.id = e.batch_id
      WHERE e.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (courseId) {
      query += ` AND e.course_id = $${paramIndex++}`;
      params.push(courseId);
    }

    if (batchId) {
      query += ` AND e.batch_id = $${paramIndex++}`;
      params.push(batchId);
    }

    if (status) {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex} OR LOWER(c.title) LIKE $${paramIndex})`;
      params.push(term);
      paramIndex++;
    }

    query += ` ORDER BY e.enrolled_at DESC`;

    const res = await db.query(query, params);
    return (res.rows || []).map(DrizzleEnrollmentRepository.toDomain).filter(Boolean);
  }

  async save(enrollment) {
    const raw = DrizzleEnrollmentRepository.toPersistence(enrollment);
    this._enrollmentStore.set(enrollment.id, raw);

    if (!this.db) {
      return enrollment;
    }

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    await db.query(
      `INSERT INTO enrollments (id, tenant_id, student_user_id, course_id, batch_id, status, progress_percentage, enrolled_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         batch_id = EXCLUDED.batch_id,
         status = EXCLUDED.status,
         progress_percentage = EXCLUDED.progress_percentage,
         updated_at = NOW()`,
      [raw.id, raw.tenantId, raw.studentUserId, raw.courseId, raw.batchId, raw.status, raw.progressPercentage, raw.enrolledAt, raw.updatedAt]
    );

    return enrollment;
  }

  async delete(id) {
    this._enrollmentStore.delete(id);
    if (!this.db) return true;

    const db = typeof this.db.connect === 'function' ? await this.db.connect() : this.db;
    await db.query('DELETE FROM enrollments WHERE id = $1', [id]);
    return true;
  }
}

module.exports = { DrizzleEnrollmentRepository };
