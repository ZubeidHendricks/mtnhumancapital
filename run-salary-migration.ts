import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    const migration = `
      ALTER TABLE fleetlogix_drivers 
      ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'monthly',
      ADD COLUMN IF NOT EXISTS bonus_per_load DECIMAL(10, 2);
    `;

    await db.execute(sql.raw(migration));
    console.log('✓ Migration complete: Added salary fields to fleetlogix_drivers');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
