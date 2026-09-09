const { BaseRepository } = require('./BaseRepository');
const { userSessionsTable } = require('../schema/auth.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

function rowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId || row.user_id,
    refreshTokenHash: row.refreshTokenHash || row.refresh_token_hash,
    deviceName: row.deviceName || row.device_name,
    ipAddress: row.ipAddress || row.ip_address,
    userAgent: row.userAgent || row.user_agent,
    expiresAt: row.expiresAt || row.expires_at,
    revokedAt: row.revokedAt || row.revoked_at,
    createdAt: row.createdAt || row.created_at
  };
}

class DrizzleUserSessionRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = userSessionsTable;
  }

  async create(session) {
    const db = await this.db.connect();
    if (db.insert) {
      await db.insert(this.table).values(session);
    } else {
      await db.query(
        `INSERT INTO user_sessions
          (id, user_id, refresh_token_hash, device_name, ip_address, user_agent, expires_at, created_at, last_activity_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          session.id,
          session.userId,
          session.refreshTokenHash,
          session.deviceName || null,
          session.ipAddress || null,
          session.userAgent || null,
          session.expiresAt
        ]
      );
    }
    return session;
  }

  async findActiveByRefreshTokenHash(hash) {
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.refreshTokenHash, hash), isNull(this.table.revokedAt)))
        .limit(1);
      return rows[0] ? rowToSession(rows[0]) : null;
    }
    const res = await db.query(
      `SELECT * FROM user_sessions
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [hash]
    );
    return res.rows[0] ? rowToSession(res.rows[0]) : null;
  }

  async revoke(id) {
    const db = await this.db.connect();
    if (db.update) {
      await db.update(this.table).set({ revokedAt: new Date() }).where(eq(this.table.id, id));
      return;
    }
    await db.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1`, [id]);
  }

  async revokeByRefreshTokenHash(hash) {
    const db = await this.db.connect();
    if (db.update) {
      await db.update(this.table).set({ revokedAt: new Date() }).where(eq(this.table.refreshTokenHash, hash));
      return;
    }
    await db.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1`, [hash]);
  }

  async revokeAllForUser(userId) {
    const db = await this.db.connect();
    if (db.update) {
      await db
        .update(this.table)
        .set({ revokedAt: new Date() })
        .where(and(eq(this.table.userId, userId), isNull(this.table.revokedAt)));
      return;
    }
    await db.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
  }
}

module.exports = { DrizzleUserSessionRepository };
