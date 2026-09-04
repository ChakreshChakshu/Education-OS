const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const pg = require('pg');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL;

console.log('[Neon Seed] Connecting to:', dbUrl ? dbUrl.split('@')[1] : 'MISSING');

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function seedDatabase() {
  try {
    await client.connect();
    console.log('[Neon Seed] Connected to Neon Cloud PostgreSQL!');

    const tenantId = '01917f8a-9c42-7a1b-8c4d-123456789abc';
    const orgId = '01917f8e-9012-4abc-9def-123456789abc';
    const adminUserId = '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
    const course1Id = '01917f8b-3d21-7b89-a2c3-987654321def';
    const course2Id = '01917f8c-4e32-8c90-b3d4-109876543210';
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);

    // 1. Seed Tenant
    await client.query(`
      INSERT INTO tenants (id, name, slug, status)
      VALUES ($1, 'Education OS Main Campus', 'main-campus', 'ACTIVE')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    `, [tenantId]);
    console.log('✅ Seeded Tenant: Education OS Main Campus');

    // 2. Seed Organization
    await client.query(`
      INSERT INTO organizations (id, tenant_id, name, status)
      VALUES ($1, $2, 'Main Branch Campus', 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;
    `, [orgId, tenantId]);
    console.log('✅ Seeded Organization: Main Branch Campus');

    // 3. Seed Admin User
    await client.query(`
      INSERT INTO users (id, email, password_hash, name, status)
      VALUES ($1, 'admin@educationos.io', $2, 'Dr. Harrison Admin', 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [adminUserId, hashedPassword]);
    console.log('✅ Seeded Admin User: admin@educationos.io (Password: AdminPassword123!)');

    // 4. Seed Courses
    await client.query(`
      INSERT INTO courses (id, tenant_id, code, title, description, duration, status)
      VALUES ($1, $2, 'CS-101', 'Enterprise Educational Architecture', 'Learn clean architecture, domain aggregates, and monorepo patterns.', '4 Weeks', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [course1Id, tenantId]);

    await client.query(`
      INSERT INTO courses (id, tenant_id, code, title, description, duration, status)
      VALUES ($1, $2, 'CS-204', 'Distributed Microservices Design', 'Event-driven microservices, saga patterns, and resilient messaging.', '8 Weeks', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [course2Id, tenantId]);
    console.log('✅ Seeded 2 Courses: CS-101 (4 Weeks) & CS-204 (8 Weeks)');

    // 5. Seed Lesson Modules for CS-101
    await client.query(`
      INSERT INTO lesson_modules (id, course_id, title, content_type, content_url, order_index, status)
      VALUES ('01917f8e-1111-4111-a111-111111111111', $1, 'Lecture 1: Architecture Core Overview', 'VIDEO', 'http://localhost:3001/uploads/lecture1.mp4', 1, 'PUBLISHED')
      ON CONFLICT (id) DO NOTHING;
    `, [course1Id]);

    await client.query(`
      INSERT INTO lesson_modules (id, course_id, title, content_type, content_url, order_index, status)
      VALUES ('01917f8e-2222-4222-a222-222222222222', $1, 'Chapter 1 Handout (PDF Reading)', 'DOCUMENT', 'http://localhost:3001/uploads/handout.pdf', 2, 'PUBLISHED')
      ON CONFLICT (id) DO NOTHING;
    `, [course1Id]);

    await client.query(`
      INSERT INTO lesson_modules (id, course_id, title, content_type, quiz_json, order_index, status)
      VALUES ('01917f8e-3333-4333-a333-333333333333', $1, 'Unit 1 Architecture Quiz', 'QUIZ', $2, 3, 'PUBLISHED')
      ON CONFLICT (id) DO NOTHING;
    `, [course1Id, JSON.stringify({
      question: "What is the main advantage of the Modular Monolith pattern?",
      options: [
        { key: "A", text: "Domain Isolation with Low Deployment Complexity" },
        { key: "B", text: "Multiple independent Kubernetes Clusters" },
        { key: "C", text: "Direct Cross-Database Queries without Abstractions" }
      ],
      correct: "A"
    })]);
    console.log('✅ Seeded 3 Lesson Modules (Video, Document, Quiz)');

    console.log('🎉 NEON CLOUD DATABASE FULLY SEEDED & READY FOR USE!');
    await client.end();
  } catch (err) {
    console.error('[Neon Seed] Error:', err);
  }
}

seedDatabase();
