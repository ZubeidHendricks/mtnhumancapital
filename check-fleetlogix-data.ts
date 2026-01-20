import { db } from "./server/db";
import { 
  fleetlogixDrivers, 
  fleetlogixVehicles, 
  fleetlogixRoutes,
  fleetlogixLoads,
  users
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  try {
    console.log("Checking FleetLogix data...\n");

    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);
    
    if (allUsers.length > 0) {
      console.log("\nUser details:");
      allUsers.forEach(user => {
        console.log(`  - ${user.username} (tenantId: ${user.tenantId})`);
      });
    }

    // Get all drivers with their tenantIds
    const allDrivers = await db.select().from(fleetlogixDrivers);
    console.log(`\nFound ${allDrivers.length} drivers total`);
    
    if (allDrivers.length > 0) {
      // Group by tenantId
      const byTenant = allDrivers.reduce((acc, driver) => {
        const tid = driver.tenantId || "null";
        if (!acc[tid]) acc[tid] = [];
        acc[tid].push(driver);
        return acc;
      }, {} as Record<string, typeof allDrivers>);

      console.log("\nDrivers by tenant:");
      Object.entries(byTenant).forEach(([tenantId, drivers]) => {
        console.log(`  TenantID ${tenantId}: ${drivers.length} drivers`);
        drivers.slice(0, 3).forEach(d => {
          console.log(`    - ${d.name}`);
        });
        if (drivers.length > 3) {
          console.log(`    ... and ${drivers.length - 3} more`);
        }
      });
    }

    // Check other tables
    const vehicleCount = (await db.select().from(fleetlogixVehicles)).length;
    const routeCount = (await db.select().from(fleetlogixRoutes)).length;
    const loadCount = (await db.select().from(fleetlogixLoads)).length;

    console.log(`\nOther FleetLogix data:`);
    console.log(`  - Vehicles: ${vehicleCount}`);
    console.log(`  - Routes: ${routeCount}`);
    console.log(`  - Loads: ${loadCount}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkData();
