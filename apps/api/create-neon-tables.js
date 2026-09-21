const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const pg = require('pg');

const dbUrl = process.env.DATABASE_URL;

console.log('Connecting to Neon host:', dbUrl ? dbUrl.split('@')[1] : 'MISSING');

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runNeonMigration() {
  try {
    await client.connect();
    console.log('[Neon Cloud] CONNECTED SUCCESSFULLY! 🐘🚀');

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
      );`,

      // 8. User Sessions Table (Opaque Refresh Tokens)
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
        device_name VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 9. Roles Table
      `CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 10. Permissions Table
      `CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 11. Role Permissions Table
      `CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (role_id, permission_id)
      );`,

      // 12. Role Assignments Table (Scoped Multi-Tenant RBAC)
      `CREATE TABLE IF NOT EXISTS role_assignments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, tenant_id, organization_id, role_id)
      );`,

      // 13. User Tenant Memberships Table
      `CREATE TABLE IF NOT EXISTS user_tenant_memberships (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, tenant_id)
      );`,

      // 14. Organization Memberships Table
      `CREATE TABLE IF NOT EXISTS organization_memberships (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, user_id)
      );`,

      // 15. Batches Table
      `CREATE TABLE IF NOT EXISTS batches (
        id UUID PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        term VARCHAR(50),
        capacity INTEGER NOT NULL DEFAULT 50,
        instructor_user_id UUID REFERENCES users(id),
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 16. Subjects Table
      `CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 17. Student Progress Table
      `CREATE TABLE IF NOT EXISTS student_progress (
        id UUID PRIMARY KEY,
        student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        batch_id UUID REFERENCES batches(id),
        lesson_module_id UUID NOT NULL REFERENCES lesson_modules(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 18. Quiz Submissions Table
      `CREATE TABLE IF NOT EXISTS quiz_submissions (
        id UUID PRIMARY KEY,
        student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_module_id UUID NOT NULL REFERENCES lesson_modules(id) ON DELETE CASCADE,
        score DOUBLE PRECISION NOT NULL,
        passed BOOLEAN NOT NULL DEFAULT FALSE,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // 19. Outbox Events Table
      `CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY,
        event_name VARCHAR(100) NOT NULL,
        aggregate_type VARCHAR(100) NOT NULL,
        aggregate_id UUID NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at);`,

      // 20. Jobs Table (Queue Engine)
      `CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY,
        job_name VARCHAR(100) NOT NULL,
        queue_name VARCHAR(50) NOT NULL DEFAULT 'default',
        payload JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        priority INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_status_available ON jobs(status, available_at, priority DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_queue_name ON jobs(queue_name);`
    ];

    for (const sql of sqlStatements) {
      await client.query(sql);
    }
    console.log('🎉 SUCCESS: All 20 tables created directly inside Neon PostgreSQL Cloud!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log('Current Tables in Neon Public Schema:', res.rows.map(r => r.table_name));

    await client.end();
  } catch (err) {
    console.error('Neon Execution Error:', err);
  }
}

runNeonMigration();
