/* Run from apps/api: node --env-file=.env scripts/migrate-available-talent.cjs */
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Client } = require('pg');
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is missing from apps/api/.env.');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT to_regclass('public.available_talent_state') AS existing",
    );
    if (result.rows[0].existing) {
      console.log('STEP-Available Talent migration is already applied.');
      return;
    }
    await client.query(
      readFileSync(
        resolve(__dirname, '../../sql/available_talent_migration.sql'),
        'utf8',
      ),
    );
    console.log('STEP-Available Talent tables created successfully.');
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
