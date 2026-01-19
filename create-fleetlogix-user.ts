import "dotenv/config";
import { db } from "./server/db";
import { users, tenantConfig } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createFleetLogixUser() {
  try {
    console.log("Checking for FleetLogix tenant...");

    // Check if FleetLogix tenant exists by subdomain
    let fleetLogixTenant = await db
      .select()
      .from(tenantConfig)
      .where(eq(tenantConfig.subdomain, "fleetlogix"))
      .limit(1);

    let tenantId: string;

    if (fleetLogixTenant.length === 0) {
      console.log("Creating FleetLogix tenant...");
      const [newTenant] = await db
        .insert(tenantConfig)
        .values({
          companyName: "FleetLogix",
          subdomain: "fleetlogix",
          primaryColor: "#0ea5e9",
          modulesEnabled: {},
          apiKeysConfigured: {},
        })
        .returning();
      tenantId = newTenant.id;
      console.log(`✓ Created FleetLogix tenant with ID: ${tenantId}`);
    } else {
      tenantId = fleetLogixTenant[0].id;
      console.log(`✓ FleetLogix tenant exists with ID: ${tenantId}`);
    }

    // Check if admin user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin@fleetlogix.co.za"))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("\nUser admin@fleetlogix.co.za already exists!");
      console.log("Updating password to: admin123");

      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, "admin@fleetlogix.co.za"));

      console.log("✓ Password updated successfully");
    } else {
      console.log("\nCreating admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await db.insert(users).values({
        username: "admin@fleetlogix.co.za",
        password: hashedPassword,
        tenantId: tenantId,
        role: "admin",
        isSuperAdmin: 0,
      });

      console.log("✓ Created admin user");
    }

    console.log("\n=================================");
    console.log("FleetLogix Admin Credentials:");
    console.log("=================================");
    console.log("Email:    admin@fleetlogix.co.za");
    console.log("Password: admin123");
    console.log("Tenant:   FleetLogix");
    console.log("=================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createFleetLogixUser();
