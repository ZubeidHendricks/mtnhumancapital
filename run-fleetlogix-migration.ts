import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function runMigration() {
  try {
    console.log("🚀 Running FleetLogix migration...");

    const migrationSQL = fs.readFileSync("./migrations/0011_add_fleetlogix_tables.sql", "utf8");

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ FleetLogix migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
