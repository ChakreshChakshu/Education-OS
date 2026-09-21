const { BaseRepository } = require('./BaseRepository');
const { outboxEventsTable } = require('../schema/queue.schema');
const crypto = require('crypto');

class DrizzleOutboxRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = outboxEventsTable;
  }

  _resolveDb(client = null) {
    const target = client || this.db;
    if (!target) return null;
    if (typeof target.query === 'function') return target;
    if (target.pool && typeof target.pool.query === 'function') return target.pool;
    if (target.db && typeof target.db.query === 'function') return target.db;
    return target;
  }

  async create(eventData, client = null) {
    const db = this._resolveDb(client);
    const record = {
      id: eventData.id || crypto.randomUUID(),
      eventName: eventData.eventName,
      aggregateType: eventData.aggregateType,
      aggregateId: eventData.aggregateId,
      payload: typeof eventData.payload === 'string' ? eventData.payload : JSON.stringify(eventData.payload || {}),
      status: eventData.status || 'PENDING',
      attempts: eventData.attempts || 0,
      lastError: eventData.lastError || null,
      processedAt: eventData.processedAt || null,
      createdAt: eventData.createdAt || new Date()
    };

    if (db && typeof db.query === 'function') {
      const sql = `
        INSERT INTO outbox_events (id, event_name, aggregate_type, aggregate_id, payload, status, attempts, last_error, processed_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const res = await db.query(sql, [
        record.id,
        record.eventName,
        record.aggregateType,
        record.aggregateId,
        record.payload,
        record.status,
        record.attempts,
        record.lastError,
        record.processedAt,
        record.createdAt
      ]);
      return res.rows[0];
    }

    if (db && db.insert) {
      const rows = await db.insert(this.table).values(record).returning();
      return rows[0];
    }

    throw new Error('Database connection unavailable for OutboxRepository.create');
  }

  async fetchPending(limit = 10, client = null) {
    const db = this._resolveDb(client);
    if (db && typeof db.query === 'function') {
      // Use FOR UPDATE SKIP LOCKED for high-concurrency worker safety
      const sql = `
        SELECT id, event_name, aggregate_type, aggregate_id, payload, status, attempts, created_at
        FROM outbox_events
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `;
      const res = await db.query(sql, [limit]);
      return res.rows.map(r => ({
        id: r.id,
        eventName: r.event_name,
        aggregateType: r.aggregate_type,
        aggregateId: r.aggregate_id,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
        status: r.status,
        attempts: r.attempts,
        createdAt: r.created_at
      }));
    }

    return [];
  }

  async markDispatched(id, client = null) {
    const db = this._resolveDb(client);
    const now = new Date();
    if (db && typeof db.query === 'function') {
      const sql = `
        UPDATE outbox_events
        SET status = 'DISPATCHED', processed_at = $1
        WHERE id = $2
        RETURNING id
      `;
      const res = await db.query(sql, [now, id]);
      return res.rows[0];
    }

    return null;
  }

  async markFailed(id, error, client = null) {
    const db = this._resolveDb(client);
    if (db && typeof db.query === 'function') {
      const sql = `
        UPDATE outbox_events
        SET status = 'FAILED', attempts = attempts + 1, last_error = $1
        WHERE id = $2
        RETURNING id
      `;
      const res = await db.query(sql, [String(error), id]);
      return res.rows[0];
    }

    return null;
  }
}

module.exports = { DrizzleOutboxRepository };
