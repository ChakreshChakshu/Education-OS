const { BaseRepository } = require('./BaseRepository');
const { usersTable } = require('../schema/identity.schema');
const { eq, and, isNull } = require('../drizzle-bridge');

class DrizzleUserRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.table = usersTable;
    this._memoryStore = new Map();
  }

  static toDomain(row) {
    if (!row) return null;
    const { User, Email } = require('../domain-identity-bridge');
    
    const emailRes = Email.create(row.email);
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
      email: user.email.value,
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
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleUserRepository.toDomain(rows[0]) : null;
    }
    const raw = this._memoryStore.get(id);
    return raw ? DrizzleUserRepository.toDomain(raw) : null;
  }

  async findByEmail(emailStr) {
    if (this.db && this.db.select) {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(and(eq(this.table.email, emailStr.toLowerCase()), isNull(this.table.deletedAt)))
        .limit(1);
      return rows[0] ? DrizzleUserRepository.toDomain(rows[0]) : null;
    }
    const lower = emailStr.toLowerCase();
    for (const raw of this._memoryStore.values()) {
      if (raw.email.toLowerCase() === lower && !raw.deletedAt) {
        return DrizzleUserRepository.toDomain(raw);
      }
    }
    return null;
  }

  async save(user) {
    const raw = DrizzleUserRepository.toPersistence(user);
    if (this.db && this.db.insert) {
      await this.db.insert(this.table).values(raw).onConflictDoUpdate({
        target: this.table.id,
        set: raw
      });
    }
    this._memoryStore.set(user.id, raw);
    return user;
  }
}

module.exports = { DrizzleUserRepository };
