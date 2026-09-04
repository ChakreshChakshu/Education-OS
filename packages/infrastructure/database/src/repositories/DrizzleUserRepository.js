const { BaseRepository } = require('./BaseRepository');
const { usersTable } = require('../schema/identity.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleUserRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = usersTable;
  }

  static toDomain(row) {
    if (!row) return null;
    const { User, Email } = require('../domain-identity-bridge');
    
    const emailStr = typeof row.email === 'string' ? row.email : row.email?.value;
    const emailRes = Email.create(emailStr);
    if (emailRes.isFailure) return null;

    const userRes = User.create(
      {
        email: emailRes.getValue(),
        passwordHash: row.passwordHash || row.password_hash,
        name: row.name,
        avatar: row.avatar,
        phone: row.phone,
        timezone: row.timezone,
        language: row.language,
        emailVerifiedAt: row.emailVerifiedAt || row.email_verified_at,
        status: row.status,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        deletedAt: row.deletedAt || row.deleted_at,
        version: row.version
      },
      row.id
    );

    return userRes.isSuccess ? userRes.getValue() : null;
  }

  static toPersistence(user) {
    return {
      id: user.id,
      email: typeof user.email === 'string' ? user.email : user.email.value,
      passwordHash: user.passwordHash,
      name: user.name,
      avatar: user.props.avatar,
      phone: user.props.phone,
      timezone: user.props.timezone,
      language: user.props.language,
      emailVerifiedAt: user.props.emailVerifiedAt,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.props.deletedAt,
      version: user.props.version || 1
    };
  }

  async findById(id) {
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleUserRepository.toDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
    return res.rows[0] ? DrizzleUserRepository.toDomain(res.rows[0]) : null;
  }

  async findByEmail(emailStr) {
    if (!emailStr) return null;
    const lower = emailStr.toLowerCase();
    const db = await this.db.connect();
    if (db.select) {
      const rows = await db
        .select()
        .from(this.table)
        .where(and(eq(this.table.email, lower), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleUserRepository.toDomain(rows[0]) : null;
    }
    const res = await db.query('SELECT * FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL LIMIT 1', [lower]);
    return res.rows[0] ? DrizzleUserRepository.toDomain(res.rows[0]) : null;
  }

  async save(user) {
    const raw = DrizzleUserRepository.toPersistence(user);
    const db = await this.db.connect();
    if (db.insert) {
      await db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    } else {
      await db.query(`
        INSERT INTO users (id, email, password_hash, name, avatar, phone, timezone, language, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          updated_at = NOW();
      `, [raw.id, raw.email, raw.passwordHash, raw.name, raw.avatar, raw.phone, raw.timezone, raw.language, raw.status, raw.createdAt, raw.updatedAt]);
    }
    return user;
  }
}

module.exports = { DrizzleUserRepository };
