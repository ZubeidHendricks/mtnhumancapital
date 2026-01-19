import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkTables() {
  const tables = ['fleetlogix_drivers', 'fleetlogix_vehicles', 'fleetlogix_routes', 'fleetlogix_loads'];

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${table}'
        ORDER BY ordinal_position;
      `));

      console.log(`\n✅ ${table} structure:`);
      console.log(result.rows);
    } catch (error) {
      console.error(`❌ Error checking ${table}:`, error);
    }
  }

  process.exit(0);
}

checkTables();
