let drizzleNodePg, drizzleNeon, pg, neonPool;

const path = require('path');

try {
  drizzleNodePg = require('drizzle-orm/node-postgres').drizzle;
} catch (e) {
  try {
    const apiDrizzlePath = path.resolve(__dirname, '../../../../../apps/api/node_modules/drizzle-orm/node-postgres');
    drizzleNodePg = require(apiDrizzlePath).drizzle;
  } catch (err) {}
}

try {
  pg = require('pg');
} catch (e) {
  try {
    const apiPgPath = path.resolve(__dirname, '../../../../../apps/api/node_modules/pg');
    pg = require(apiPgPath);
  } catch (err) {}
}

try {
  drizzleNeon = require('drizzle-orm/neon-serverless').drizzle;
  neonPool = require('@neondatabase/serverless').Pool;
} catch (e) {}

class DatabaseClient {
  constructor(config = {}) {
    this.config = config;
    this.connected = false;
    this.db = null;
    this.pool = null;
  }

  async connect() {
    if (this.connected) return this.db;

    const connStr = (this.config && this.config.connectionString) || process.env.DATABASE_URL;

    if (!connStr) {
      throw new Error('[DatabaseClient FATAL] DATABASE_URL environment variable is missing! Direct Neon PostgreSQL connection is strictly required. Local memory fallback is disabled.');
    }

    // 1. Try Neon Serverless Pool if available & target URL is Neon DB
    if (drizzleNeon && neonPool && connStr.includes('neon.tech')) {
      try {
        this.pool = new neonPool({ connectionString: connStr });
        this.db = drizzleNeon(this.pool);
        this.connected = true;
        console.log('[DatabaseClient] Connected to Neon PostgreSQL Cloud (Serverless Driver)');
        return this.db;
      } catch (err) {
        console.warn('[DatabaseClient] Neon Serverless pool connection warning:', err.message);
      }
    }

    // 2. Standard pg driver
    if (pg) {
      this.pool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        max: (this.config && this.config.maxConnections) || 10
      });

      if (drizzleNodePg) {
        this.db = drizzleNodePg(this.pool);
      } else {
        this.db = this.pool;
      }
      this.connected = true;
      console.log('[DatabaseClient] Connected directly to Neon PostgreSQL Cloud (pg Driver)');
      return this.db;
    }

    throw new Error('[DatabaseClient FATAL] Could not initialize PostgreSQL driver (pg). Direct Neon Cloud connection failed.');
  }

  async disconnect() {
    if (this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }
    this.connected = false;
    this.db = null;
    this.pool = null;
    console.log('[DatabaseClient] Disconnected from PostgreSQL instance');
  }
}

module.exports = { DatabaseClient };
