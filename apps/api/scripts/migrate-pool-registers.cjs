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
    const state = await client.query(
      "SELECT to_regclass('public.pool_register_state') AS existing",
    );
    if (!state.rows[0].existing) {
      await client.query(
        readFileSync(
          resolve(__dirname, '../../sql/pool_registers_migration.sql'),
          'utf8',
        ),
      );
      console.log('Pool register base tables created successfully.');
    }

    const split = await client.query(
      `SELECT
        to_regclass('public.development_pool_register') AS development,
        to_regclass('public.talent_pool_register') AS talent`,
    );
    if (split.rows[0].development && split.rows[0].talent) {
      console.log('Separate Development and Talent Pool tables already exist.');
      return;
    }
    if (split.rows[0].development || split.rows[0].talent)
      throw new Error(
        'Only one split Pool Register table exists. Restore a consistent schema before retrying.',
      );

    await client.query(
      readFileSync(
        resolve(
          __dirname,
          '../../sql/split_pool_register_tables_migration.sql',
        ),
        'utf8',
      ),
    );
    console.log('Development and Talent Pool tables split successfully.');
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
