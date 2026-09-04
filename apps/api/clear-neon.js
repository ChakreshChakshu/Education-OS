const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const pg = require('pg');

const dbUrl = process.env.DATABASE_URL;

console.log('[Neon Clear] Connecting to:', dbUrl ? dbUrl.split('@')[1] : 'MISSING');

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function clearDatabase() {
  try {
    await client.connect();
    console.log('[Neon Clear] Connected to Neon Cloud PostgreSQL!');

    // Truncate existing tables with CASCADE
    await client.query(`
      TRUNCATE TABLE enrollments, lesson_modules, courses, media_assets, organizations, tenants, users CASCADE;
    `);

    console.log('🧹 SUCCESS: All data cleared from Neon Cloud database tables!');
    await client.end();
  } catch (err) {
    console.error('[Neon Clear] Error clearing database:', err);
  }
}

clearDatabase();
