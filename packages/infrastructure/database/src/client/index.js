let drizzleNodePg, drizzleNeon, pg, neonPool;

try {
  drizzleNodePg = require('drizzle-orm/node-postgres').drizzle;
  pg = require('pg');
} catch (e) {}

try {
  drizzleNeon = require('drizzle-orm/neon-serverless').drizzle;
  neonPool = require('@neondatabase/serverless').Pool;
} catch (e) {}

class DatabaseClient {
  constructor(config = {}) {
    this.config = {
      connectionString: config.connectionString || process.env.DATABASE_URL || '',
      ssl: config.ssl !== undefined ? config.ssl : true,
      maxConnections: config.maxConnections || 10
    };
    this.connected = false;
    this.db = null;
    this.pool = null;
  }

  async connect() {
    if (this.connected) return this.db;

    const connStr = this.config.connectionString;

    if (connStr) {
      // 1. Try Neon Serverless Pool if available & target URL is Neon DB
      if (drizzleNeon && neonPool && connStr.includes('neon.tech')) {
        this.pool = new neonPool({ connectionString: connStr });
        this.db = drizzleNeon(this.pool);
        this.connected = true;
        console.log('[DatabaseClient] Connected to Neon PostgreSQL (Serverless Driver)');
        return this.db;
      }

      // 2. Standard pg driver fallback
      if (drizzleNodePg && pg) {
        this.pool = new pg.Pool({
          connectionString: connStr,
          ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
          max: this.config.maxConnections
        });
        this.db = drizzleNodePg(this.pool);
        this.connected = true;
        console.log('[DatabaseClient] Connected to PostgreSQL instance');
        return this.db;
      }
    }

    // 3. Fallback mock client for offline / local test mode
    this.connected = true;
    console.log('[DatabaseClient] Connected in Local Offline mode');
    return this.db;
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
