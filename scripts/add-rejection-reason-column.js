/**
 * One-off: add rejection_reason to loan_applications if missing.
 * Run from project root: node scripts/add-rejection-reason-column.js
 * Requires: pnpm run build first, and .env with DB_* set.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const { default: ds } = await import(
    path.join(__dirname, '..', 'dist', 'core', 'database', 'data-source.js')
  );
  if (!ds.isInitialized) await ds.initialize();
  const runner = ds.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`
      ALTER TABLE "loan_applications"
      ADD COLUMN IF NOT EXISTS "rejection_reason" varchar(500)
    `);
    console.log('Column rejection_reason ensured on loan_applications.');
  } finally {
    await runner.release();
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
