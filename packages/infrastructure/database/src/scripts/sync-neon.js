const path = require('path');
const fs = require('fs');

// Read apps/api/.env manually
const envPath = path.join(__dirname, '../../../../apps/api/.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envLines) {
    if (line.startsWith('DATABASE_URL=')) {
      process.env.DATABASE_URL = line.substring('DATABASE_URL='.length).trim();
    }
  }
}

console.log('[Neon Sync] Database URL Target:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'NOT FOUND');

let pg;
try {
  pg = require('pg');
} catch (e) {
  try {
    pg = require('../../../../node_modules/pg');
  } catch (err) {
    console.error('pg module not found:', err.message);
  }
}

async function syncNeonDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing!');
    return;
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[Neon Sync] Connected to Neon PostgreSQL Server directly! 🐘');

    const sqlStatements = [
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

      // 1. Users Table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        phone VARCHAR(50),
        timezone VARCHAR(50) DEFAULT 'UTC',
        language VARCHAR(10) DEFAULT 'en',
        email_verified_at TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER NOT NULL DEFAULT 1
      );`,

      // 2. Tenants Table
      `CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        settings_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER NOT NULL DEFAULT 1
      );`,

      // 3. Organizations Table
      `CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER NOT NULL DEFAULT 1
      );`,

      // 4. Courses Table
      `CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration VARCHAR(50) DEFAULT '4 Weeks',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER NOT NULL DEFAULT 1
      );`,

      // 5. Lesson Modules Table
      `CREATE TABLE IF NOT EXISTS lesson_modules (
        id UUID PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id),
        title VARCHAR(255) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        content_url TEXT,
        quiz_json JSONB,
        order_index INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 6. Enrollments Table
      `CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        course_id UUID NOT NULL REFERENCES courses(id),
        student_user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        progress_percentage INTEGER DEFAULT 0,
        enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 7. Media Assets Table
      `CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        uploader_user_id UUID REFERENCES users(id),
        filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        storage_url TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'READY',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    ];

    for (const sql of sqlStatements) {
      await client.query(sql);
    }
    console.log('[Neon Sync] SUCCESS! All 7 database tables created on Neon PostgreSQL cloud! 🚀');

    await client.end();
  } catch (err) {
    console.error('[Neon Sync] ERROR:', err.message);
  }
}

syncNeonDatabase();
