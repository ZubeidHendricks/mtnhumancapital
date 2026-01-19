import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users } from "../db/schema";
import bcrypt from "bcryptjs";

const sqlite = new Database("avatarhc.db");
const db = drizzle(sqlite);

async function createFleetUser() {
  console.log("Creating Fleet Logix user...");
  
  const hashedPassword = await bcrypt.hash("fleet123", 10);
  
  const newUser = await db.insert(users).values({
    username: "fleetlogix_admin",
    email: "admin@fleetlogix.co.za",
    password: hashedPassword,
    role: "admin",
    tenantId: 1
  }).returning();
  
  console.log("✅ Fleet user created:", newUser[0]);
  sqlite.close();
}

createFleetUser().catch(console.error);
