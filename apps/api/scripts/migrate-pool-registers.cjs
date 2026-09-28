/* Run from apps/api: node --env-file=.env scripts/migrate-pool-registers.cjs */
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
      "SELECT to_regclass('public.pool_register_state') AS existing",
    );
    if (result.rows[0].existing) {
      console.log('Pool register migration is already applied.');
      return;
    }
    await client.query(
      readFileSync(
        resolve(__dirname, '../../sql/pool_registers_migration.sql'),
        'utf8',
      ),
    );
    console.log('Pool register tables created successfully.');
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
