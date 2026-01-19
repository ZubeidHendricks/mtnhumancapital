import { db } from "./server/db";
import { 
  fleetlogixDrivers, 
  fleetlogixVehicles, 
  fleetlogixRoutes,
  fleetlogixLoads,
  users
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedFleetLogix() {
  try {
    // Get the first user's tenantId
    const [user] = await db.select().from(users).limit(1);
    
    if (!user || !user.tenantId) {
      console.error("No user with tenantId found. Please create a user first.");
      process.exit(1);
    }

    const tenantId = user.tenantId;
    console.log(`Using tenantId: ${tenantId}`);

    // Check if FleetLogix data already exists
    const existingDrivers = await db
      .select()
      .from(fleetlogixDrivers)
      .where(eq(fleetlogixDrivers.tenantId, tenantId));

    if (existingDrivers.length > 0) {
      console.log(`Found ${existingDrivers.length} existing drivers. Skipping seed.`);
      return;
    }

    console.log("Seeding FleetLogix data...");

    // Seed Drivers
    const drivers = await db.insert(fleetlogixDrivers).values([
      {
        name: "John Doe",
        licenseNumber: "DL12345",
        contactNumber: "+27821234567",
        email: "john@example.com",
        status: "active",
        hireDate: "2024-01-15",
        tenantId: tenantId,
      },
      {
        name: "Jane Smith",
        licenseNumber: "DL67890",
        contactNumber: "+27829876543",
        email: "jane@example.com",
        status: "active",
        hireDate: "2024-02-20",
        tenantId: tenantId,
      },
    ]).returning();

    console.log(`✓ Created ${drivers.length} drivers`);

    // Seed Vehicles
    const vehicles = await db.insert(fleetlogixVehicles).values([
      {
        registrationNumber: "ABC123GP",
        fleetCode: "TRK001",
        vehicleType: "Truck",
        capacity: "30",
        status: "active",
        tenantId: tenantId,
      },
      {
        registrationNumber: "XYZ456GP",
        fleetCode: "TRK002",
        vehicleType: "Truck",
        capacity: "25",
        status: "active",
        tenantId: tenantId,
      },
    ]).returning();

    console.log(`✓ Created ${vehicles.length} vehicles`);

    // Seed Routes
    const routes = await db.insert(fleetlogixRoutes).values([
      {
        loadingPoint: "Johannesburg",
        destination: "Durban",
        distance: "568",
        normalRate: "12.50",
        holidayRate: "15.00",
        normalAmount: "7100",
        holidayAmount: "8520",
        tenantId: tenantId,
      },
      {
        loadingPoint: "Cape Town",
        destination: "Port Elizabeth",
        distance: "770",
        normalRate: "11.00",
        holidayRate: "13.50",
        normalAmount: "8470",
        holidayAmount: "10395",
        tenantId: tenantId,
      },
    ]).returning();

    console.log(`✓ Created ${routes.length} routes`);

    // Seed Loads
    const loads = await db.insert(fleetlogixLoads).values([
      {
        loadDate: "2026-01-15",
        routeId: routes[0].id,
        vehicleId: vehicles[0].id,
        driverId: drivers[0].id,
        ticketNumberB: "B00123",
        ticketNumberW: "W00123",
        tonnageB: "28.5",
        tonnageW: "27.8",
        distance: "568",
        rate: "12.50",
        isHoliday: false,
        status: "delivered",
        tenantId: tenantId,
      },
      {
        loadDate: "2026-01-16",
        routeId: routes[1].id,
        vehicleId: vehicles[1].id,
        driverId: drivers[1].id,
        ticketNumberB: "B00124",
        ticketNumberW: "W00124",
        tonnageB: "24.2",
        tonnageW: "23.9",
        distance: "770",
        rate: "11.00",
        isHoliday: false,
        status: "in-transit",
        tenantId: tenantId,
      },
    ]).returning();

    console.log(`✓ Created ${loads.length} loads`);

    console.log("\n✅ FleetLogix seed data created successfully!");
    console.log("\nSummary:");
    console.log(`  - Drivers: ${drivers.length}`);
    console.log(`  - Vehicles: ${vehicles.length}`);
    console.log(`  - Routes: ${routes.length}`);
    console.log(`  - Loads: ${loads.length}`);

  } catch (error) {
    console.error("Error seeding FleetLogix data:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedFleetLogix();
