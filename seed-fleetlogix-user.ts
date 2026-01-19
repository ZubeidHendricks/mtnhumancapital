import { db } from "./server/db";
import { 
  fleetlogixDrivers, 
  fleetlogixVehicles, 
  fleetlogixRoutes,
  fleetlogixLoads,
} from "@shared/schema";

async function seedForFleetLogixUser() {
  try {
    const tenantId = "1580efd0-8445-4afb-b961-d20ca180246b"; // admin@fleetlogix.co.za tenant
    
    console.log(`Seeding FleetLogix data for tenant: ${tenantId}\n`);

    // Seed Drivers
    const drivers = await db.insert(fleetlogixDrivers).values([
      {
        name: "Thabo Mabaso",
        licenseNumber: "DL001",
        contactNumber: "+27821234001",
        email: "thabo.mabaso@fleet.co.za",
        status: "active",
        hireDate: "2025-01-15",
        tenantId,
      },
      {
        name: "Sipho Dlamini",
        licenseNumber: "DL002",
        contactNumber: "+27821234002",
        email: "sipho.dlamini@fleet.co.za",
        status: "active",
        hireDate: "2025-02-01",
        tenantId,
      },
      {
        name: "Mandla Khumalo",
        licenseNumber: "DL003",
        contactNumber: "+27821234003",
        email: "mandla.khumalo@fleet.co.za",
        status: "active",
        hireDate: "2025-03-10",
        tenantId,
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
        tenantId,
      },
      {
        registrationNumber: "XYZ456GP",
        fleetCode: "TRK002",
        vehicleType: "Truck",
        capacity: "28",
        status: "active",
        tenantId,
      },
      {
        registrationNumber: "DEF789GP",
        fleetCode: "TRK003",
        vehicleType: "Truck",
        capacity: "32",
        status: "active",
        tenantId,
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
        tenantId,
      },
      {
        loadingPoint: "Cape Town",
        destination: "Port Elizabeth",
        distance: "770",
        normalRate: "11.00",
        holidayRate: "13.50",
        normalAmount: "8470",
        holidayAmount: "10395",
        tenantId,
      },
      {
        loadingPoint: "Pretoria",
        destination: "Polokwane",
        distance: "320",
        normalRate: "10.00",
        holidayRate: "12.00",
        normalAmount: "3200",
        holidayAmount: "3840",
        tenantId,
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
        ticketNumberB: "B00101",
        ticketNumberW: "W00101",
        tonnageB: "29.5",
        tonnageW: "28.8",
        distance: "568",
        rate: "12.50",
        isHoliday: false,
        status: "delivered",
        tenantId,
      },
      {
        loadDate: "2026-01-16",
        routeId: routes[1].id,
        vehicleId: vehicles[1].id,
        driverId: drivers[1].id,
        ticketNumberB: "B00102",
        ticketNumberW: "W00102",
        tonnageB: "27.2",
        tonnageW: "26.9",
        distance: "770",
        rate: "11.00",
        isHoliday: false,
        status: "in-transit",
        tenantId,
      },
      {
        loadDate: "2026-01-17",
        routeId: routes[2].id,
        vehicleId: vehicles[2].id,
        driverId: drivers[2].id,
        ticketNumberB: "B00103",
        ticketNumberW: "W00103",
        tonnageB: "31.5",
        tonnageW: "30.8",
        distance: "320",
        rate: "10.00",
        isHoliday: false,
        status: "pending",
        tenantId,
      },
    ]).returning();

    console.log(`✓ Created ${loads.length} loads`);

    console.log("\n✅ FleetLogix seed data created successfully for admin@fleetlogix.co.za!");
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

seedForFleetLogixUser();
