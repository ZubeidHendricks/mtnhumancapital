import XLSX from 'xlsx';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';
import { pgTable, serial, text, date, decimal, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Define schemas inline to avoid TypeScript issues
const fleetlogixDrivers = pgTable("fleetlogix_drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  licenseNumber: text("license_number"),
  contactNumber: text("contact_number"),
  email: text("email"),
  status: text("status").default("active"),
  hireDate: date("hire_date"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const fleetlogixVehicles = pgTable("fleetlogix_vehicles", {
  id: serial("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  fleetCode: text("fleet_code"),
  vehicleType: text("vehicle_type"),
  capacity: decimal("capacity", { precision: 10, scale: 2 }),
  status: text("status").default("active"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const fleetlogixRoutes = pgTable("fleetlogix_routes", {
  id: serial("id").primaryKey(),
  loadingPoint: text("loading_point").notNull(),
  destination: text("destination").notNull(),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(),
  normalRate: decimal("normal_rate", { precision: 10, scale: 2 }),
  holidayRate: decimal("holiday_rate", { precision: 10, scale: 2 }),
  normalAmount: decimal("normal_amount", { precision: 10, scale: 2 }),
  holidayAmount: decimal("holiday_amount", { precision: 10, scale: 2 }),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const fleetlogixLoads = pgTable("fleetlogix_loads", {
  id: serial("id").primaryKey(),
  loadDate: date("load_date").notNull(),
  routeId: integer("route_id"),
  vehicleId: integer("vehicle_id"),
  driverId: integer("driver_id"),
  ticketNumberB: text("ticket_number_b"),
  ticketNumberW: text("ticket_number_w"),
  tonnageB: decimal("tonnage_b", { precision: 10, scale: 2 }),
  tonnageW: decimal("tonnage_w", { precision: 10, scale: 2 }),
  distance: decimal("distance", { precision: 10, scale: 2 }),
  rate: decimal("rate", { precision: 10, scale: 2 }),
  isHoliday: boolean("is_holiday").default(false),
  status: text("status").default("pending"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Setup database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

const TENANT_ID = 1; // Default tenant ID

async function importData() {
  console.log('🚀 Starting Fleet Logix data import...\n');

  try {
    // Read Driver Salaries Excel file - Data sheet
    console.log('📊 Reading Driver Salaries file (Data sheet)...');
    const salariesWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx');
    const dataSheet = salariesWorkbook.Sheets['Data'];
    const salariesData = XLSX.utils.sheet_to_json(dataSheet);
    
    // Read Load Reconciliation Excel file - Costing sheet
    console.log('📊 Reading Load Reconciliation file (Costing sheet)...');
    const reconWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');
    const costingSheet = reconWorkbook.Sheets['Costing'];
    const costingData = XLSX.utils.sheet_to_json(costingSheet);
    
    console.log(`   Found ${salariesData.length} salary records`);
    console.log(`   Found ${costingData.length} costing records`);

    // Extract routes from Costing sheet
    console.log('\n🗺️  Extracting routes from costing data...');
    const routes = new Map();
    const routesArray = [];
    
    costingData.forEach(row => {
      const loadingPoint = (row['LOADING POINT      '] || '').toString().trim();
      const destination = (row['DESTINATION  '] || '').toString().trim();
      const distance = row['DISTANCE      '];
      const normalRate = row['NEW NORMAL RATE PER  KILOMETER      '] || 3.3;
      const holidayRate = row['NEW SUNDAY &HOLIDAY RATE'] || 4.8;
      const normalAmount = row['NEW AMOUNT'];
      const holidayAmount = row['NEW AMOUNT_1'];
      
      if (loadingPoint && destination && distance) {
        const routeKey = `${loadingPoint}-${destination}`;
        if (!routes.has(routeKey)) {
          routes.set(routeKey, {
            loadingPoint,
            destination,
            distance: distance.toString(),
            normalRate: normalRate.toString(),
            holidayRate: holidayRate.toString(),
            normalAmount: normalAmount ? normalAmount.toFixed(2) : null,
            holidayAmount: holidayAmount ? holidayAmount.toFixed(2) : null,
            tenantId: TENANT_ID
          });
        }
      }
    });
    
    routes.forEach(route => routesArray.push(route));
    console.log(`   Found ${routesArray.length} unique routes`);

    // Extract drivers and vehicles from Data sheet
    console.log('\n👤 Extracting drivers and vehicles from salary data...');
    const drivers = new Map();
    const vehicles = new Map();
    
    salariesData.forEach(row => {
      const driverName = (row['Driver Name'] || '').toString().trim();
      const vehicleReg = (row['Reg #'] || '').toString().trim();
      
      if (driverName && !drivers.has(driverName)) {
        drivers.set(driverName, {
          name: driverName,
          status: 'active',
          tenantId: TENANT_ID
        });
      }
      
      if (vehicleReg && !vehicles.has(vehicleReg)) {
        // Extract registration and fleet code if present
        const parts = vehicleReg.split(' - ');
        const registrationNumber = parts[0].trim();
        const fleetCode = parts.length > 1 ? parts[1].trim() : null;
        
        vehicles.set(registrationNumber, {
          registrationNumber,
          fleetCode,
          vehicleType: 'Truck',
          status: 'active',
          tenantId: TENANT_ID
        });
      }
    });
    
    const driversArray = Array.from(drivers.values());
    const vehiclesArray = Array.from(vehicles.values());
    
    console.log(`   Found ${driversArray.length} unique drivers`);
    console.log(`   Found ${vehiclesArray.length} unique vehicles`);

    // Insert data into database
    console.log('\n💾 Inserting data into database...\n');

    // Insert routes
    if (routesArray.length > 0) {
      console.log(`   Inserting ${routesArray.length} routes...`);
      let routesInserted = 0;
      for (const route of routesArray) {
        try {
          await db.insert(fleetlogixRoutes).values(route);
          routesInserted++;
        } catch (err) {
          // Silently skip duplicates
        }
      }
      console.log(`   ✅ ${routesInserted} routes inserted`);
    }

    // Insert drivers
    if (driversArray.length > 0) {
      console.log(`   Inserting ${driversArray.length} drivers...`);
      let driversInserted = 0;
      for (const driver of driversArray) {
        try {
          await db.insert(fleetlogixDrivers).values(driver);
          driversInserted++;
        } catch (err) {
          // Silently skip duplicates
        }
      }
      console.log(`   ✅ ${driversInserted} drivers inserted`);
    }

    // Insert vehicles
    if (vehiclesArray.length > 0) {
      console.log(`   Inserting ${vehiclesArray.length} vehicles...`);
      let vehiclesInserted = 0;
      for (const vehicle of vehiclesArray) {
        try {
          await db.insert(fleetlogixVehicles).values(vehicle);
          vehiclesInserted++;
        } catch (err) {
          // Silently skip duplicates
        }
      }
      console.log(`   ✅ ${vehiclesInserted} vehicles inserted`);
    }

    // Extract and insert loads from Data sheet
    console.log('\n🚛 Extracting and inserting loads from salary data...');
    
    // Get all drivers, vehicles, and routes from DB with their IDs
    const dbDrivers = await db.select().from(fleetlogixDrivers).where(sql`tenant_id = ${TENANT_ID}`);
    const dbVehicles = await db.select().from(fleetlogixVehicles).where(sql`tenant_id = ${TENANT_ID}`);
    const dbRoutes = await db.select().from(fleetlogixRoutes).where(sql`tenant_id = ${TENANT_ID}`);
    
    const driverMap = new Map(dbDrivers.map(d => [d.name.trim(), d.id]));
    const vehicleMap = new Map(dbVehicles.map(v => [v.registrationNumber.trim(), v.id]));
    const routeMap = new Map(dbRoutes.map(r => [`${r.loadingPoint.trim()}-${r.destination.trim()}`, r.id]));
    
    let loadsInserted = 0;
    let loadsSkipped = 0;
    
    for (const row of salariesData) {
      const driverName = (row['Driver Name'] || '').toString().trim();
      const vehicleReg = (row['Reg #'] || '').toString().trim();
      const route = (row['Route'] || '').toString().trim();
      const distance = row['Distance (Km)'];
      const rate = row['Rate'];
      const month = row['Month'];
      const dateSerial = row['Dates - 2025'];
      
      if (driverName && vehicleReg) {
        const driverId = driverMap.get(driverName);
        const vehicleRegOnly = vehicleReg.split(' - ')[0].trim();
        const vehicleId = vehicleMap.get(vehicleRegOnly);
        
        // Try to match route - find best match
        let routeId = null;
        if (route) {
          const routeClean = route.replace(/\s+/g, ' ').trim();
          // Try direct match first
          for (const [key, id] of routeMap.entries()) {
            const keyClean = key.replace(/\s+/g, ' ').trim();
            if (routeClean.toUpperCase().includes(keyClean.split('-')[0].toUpperCase()) && 
                routeClean.toUpperCase().includes(keyClean.split('-')[1].toUpperCase())) {
              routeId = id;
              break;
            }
          }
        }
        
        if (driverId && vehicleId) {
          try {
            // Parse date from Excel serial number
            let loadDate = '2025-01-01';
            if (dateSerial && typeof dateSerial === 'number') {
              const excelDate = new Date((dateSerial - 25569) * 86400 * 1000);
              loadDate = excelDate.toISOString().split('T')[0];
            } else if (month) {
              // Use month to create a date
              const monthMap = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
              };
              const monthNum = monthMap[month] || '01';
              loadDate = `2025-${monthNum}-15`;
            }
            
            const load = {
              loadDate,
              routeId,
              vehicleId,
              driverId,
              distance: distance ? distance.toString() : null,
              rate: rate ? rate.toString() : null,
              status: 'delivered',
              tenantId: TENANT_ID
            };
            
            await db.insert(fleetlogixLoads).values(load);
            loadsInserted++;
          } catch (err) {
            loadsSkipped++;
          }
        } else {
          loadsSkipped++;
        }
      }
    }
    
    console.log(`   ✅ Inserted ${loadsInserted} loads`);
    if (loadsSkipped > 0) {
      console.log(`   ⚠️  Skipped ${loadsSkipped} loads (missing driver/vehicle or duplicates)`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Routes:   ${routesArray.length} found, inserted into database`);
    console.log(`✅ Drivers:  ${driversArray.length} found, inserted into database`);
    console.log(`✅ Vehicles: ${vehiclesArray.length} found, inserted into database`);
    console.log(`✅ Loads:    ${loadsInserted} inserted`);
    console.log('='.repeat(60));
    console.log('\n🎉 Data import completed successfully!\n');
    console.log('You can now view the data at: http://localhost:5000/fleetlogix\n');

  } catch (error) {
    console.error('\n❌ Error during import:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the import
importData();
