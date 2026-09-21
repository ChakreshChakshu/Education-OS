const { QueueProvider } = require('./QueueProvider');
const crypto = require('crypto');
const path = require('path');

let pg;
try {
  pg = require('pg');
} catch (e) {
  try {
    const apiPgPath = path.resolve(__dirname, '../../../../apps/api/node_modules/pg');
    pg = require(apiPgPath);
  } catch (err) {}
}

class PostgresQueueProvider extends QueueProvider {
  constructor(databaseClient = null) {
    super();
    this.db = databaseClient;
    this._pool = null;
  }

  async _getQueryClient() {
    if (this.db) {
      if (typeof this.db.query === 'function') {
        return this.db;
      }
      if (this.db.pool && typeof this.db.pool.query === 'function') {
        return this.db.pool;
      }
      if (this.db.client && this.db.client.pool) {
        return this.db.client.pool;
      }
    }

    if (this._pool) {
      return this._pool;
    }

    const connStr = process.env.DATABASE_URL;
    if (!connStr) {
      throw new Error('[PostgresQueueProvider FATAL] DATABASE_URL missing for PostgreSQL queue connection.');
    }

    if (!pg) {
      throw new Error('[PostgresQueueProvider FATAL] pg driver not available.');
    }

    this._pool = new pg.Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 10
    });

    return this._pool;
  }

  static getBackoffDelay(attempts) {
    const delays = [30, 120, 600, 1800, 3600]; // 30s, 2m, 10m, 30m, 1h
    const idx = Math.min(Math.max(0, attempts - 1), delays.length - 1);
    return delays[idx];
  }

  async enqueue(jobName, payload, options = {}) {
    const client = await this._getQueryClient();
    const id = options.id || crypto.randomUUID();
    const queueName = options.queueName || 'default';
    const priority = Number.isInteger(options.priority) ? options.priority : 0;
    const maxAttempts = options.maxAttempts || 5;
    const delaySeconds = options.delaySeconds || 0;
    const serializedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload || {});

    const sql = `
      INSERT INTO jobs (
        id, job_name, queue_name, payload, status, priority,
        attempts, max_attempts, available_at, created_at
      ) VALUES (
        $1, $2, $3, $4, 'PENDING', $5,
        0, $6, NOW() + ($7 * INTERVAL '1 second'), NOW()
      )
      RETURNING *
    `;

    const res = await client.query(sql, [
      id,
      jobName,
      queueName,
      serializedPayload,
      priority,
      maxAttempts,
      delaySeconds
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      jobName: row.job_name,
      queueName: row.queue_name,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      priority: row.priority,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      availableAt: row.available_at,
      createdAt: row.created_at
    };
  }

  async dequeue(queueName = 'default', limit = 1) {
    const client = await this._getQueryClient();

    // Atomic claim with SKIP LOCKED: prevents lock contention between parallel workers
    const sql = `
      WITH next_jobs AS (
        SELECT id
        FROM jobs
        WHERE status = 'PENDING'
          AND queue_name = $1
          AND available_at <= NOW()
        ORDER BY priority DESC, available_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      UPDATE jobs j
      SET status = 'RUNNING',
          started_at = NOW(),
          attempts = j.attempts + 1
      FROM next_jobs
      WHERE j.id = next_jobs.id
      RETURNING j.id, j.job_name, j.queue_name, j.payload, j.status, j.priority,
                j.attempts, j.max_attempts, j.available_at, j.started_at, j.created_at
    `;

    const res = await client.query(sql, [queueName, limit]);
    return res.rows.map(r => ({
      id: r.id,
      jobName: r.job_name,
      queueName: r.queue_name,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      priority: r.priority,
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      availableAt: r.available_at,
      startedAt: r.started_at,
      createdAt: r.created_at
    }));
  }

  async ack(jobId) {
    const client = await this._getQueryClient();
    const sql = `
      UPDATE jobs
      SET status = 'COMPLETED', completed_at = NOW()
      WHERE id = $1
      RETURNING id, status, completed_at
    `;
    const res = await client.query(sql, [jobId]);
    return res.rows[0] || null;
  }

  async retry(jobId, error, customDelaySeconds = null) {
    const client = await this._getQueryClient();
    const checkRes = await client.query(
      `SELECT attempts, max_attempts FROM jobs WHERE id = $1`,
      [jobId]
    );

    if (checkRes.rowCount === 0) return null;
    const { attempts, max_attempts } = checkRes.rows[0];

    const errStr = error ? (error.message || String(error)) : 'Unknown error';

    // If max attempts exhausted, move directly to DLQ
    if (attempts >= max_attempts) {
      return this.moveToDeadLetter(jobId, errStr);
    }

    const delay = customDelaySeconds !== null
      ? customDelaySeconds
      : PostgresQueueProvider.getBackoffDelay(attempts);

    const sql = `
      UPDATE jobs
      SET status = 'PENDING',
          available_at = NOW() + ($1 * INTERVAL '1 second'),
          last_error = $2
      WHERE id = $3
      RETURNING id, status, attempts, available_at, last_error
    `;

    const res = await client.query(sql, [delay, errStr, jobId]);
    return res.rows[0] || null;
  }

  async moveToDeadLetter(jobId, error) {
    const client = await this._getQueryClient();
    const errStr = error ? (error.message || String(error)) : 'Exhausted retry attempts';
    const sql = `
      UPDATE jobs
      SET status = 'DEAD_LETTER',
          failed_at = NOW(),
          last_error = $1
      WHERE id = $2
      RETURNING id, status, failed_at, last_error
    `;
    const res = await client.query(sql, [errStr, jobId]);
    return res.rows[0] || null;
  }

  async cancel(jobId) {
    const client = await this._getQueryClient();
    const sql = `
      UPDATE jobs
      SET status = 'CANCELLED', failed_at = NOW()
      WHERE id = $1
      RETURNING id, status
    `;
    const res = await client.query(sql, [jobId]);
    return res.rows[0] || null;
  }

  async process(queueName, processorCallback) {
    const jobs = await this.dequeue(queueName, 1);
    if (!jobs.length) return null;

    const job = jobs[0];
    try {
      await processorCallback(job.payload, job);
      await this.ack(job.id);
      return { success: true, jobId: job.id };
    } catch (err) {
      await this.retry(job.id, err);
      return { success: false, jobId: job.id, error: err.message };
    }
  }

  async close() {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }
}

module.exports = { PostgresQueueProvider };
