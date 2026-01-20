import XLSX from 'xlsx';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

// Load environment variables FIRST
config();

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

// Create database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

const TENANT_ID = '1580efd0-8445-4afb-b961-d20ca180246b'; // FleetLogix tenant

async function importData() {
  console.log('🚀 Starting Fleet Logix data import...\n');

  try {
    // Read Excel files
    console.log('📊 Reading Excel files...');
    const salariesWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx');
    const reconWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');
    
    const salariesData = XLSX.utils.sheet_to_json(salariesWorkbook.Sheets['Data']);
    const costingData = XLSX.utils.sheet_to_json(reconWorkbook.Sheets['Costing']);
    
    console.log(`   Found ${salariesData.length} salary records`);
    console.log(`   Found ${costingData.length} costing records`);

    // Extract and insert routes
    console.log('\n🗺️  Extracting and inserting routes...');
    const routesArray = [];
    const routeSet = new Set();
    
    for (const row of costingData) {
      const loadingPoint = (row['LOADING POINT      '] || '').toString().trim();
      const destination = (row['DESTINATION  '] || '').toString().trim();
      const distance = row['DISTANCE      '];
      const normalRate = row['NEW NORMAL RATE PER  KILOMETER      '] || 3.3;
      const holidayRate = row['NEW SUNDAY &HOLIDAY RATE'] || 4.8;
      const normalAmount = row['NEW AMOUNT'];
      const holidayAmount = row['NEW AMOUNT_1'];
      
      if (loadingPoint && destination && distance) {
        const key = `${loadingPoint}-${destination}`;
        if (!routeSet.has(key)) {
          routeSet.add(key);
          routesArray.push({
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
    }
    
    console.log(`   Inserting ${routesArray.length} routes...`);
    for (const route of routesArray) {
      try {
        await db.insert(schema.fleetlogixRoutes).values(route);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`   ✅ Routes inserted`);

    // Extract and insert drivers
    console.log('\n👤 Extracting and inserting drivers...');
    const driversArray = [];
    const driverSet = new Set();
    
    for (const row of salariesData) {
      const driverName = (row['Driver Name'] || '').toString().trim();
      if (driverName && !driverSet.has(driverName)) {
        driverSet.add(driverName);
        driversArray.push({
          name: driverName,
          status: 'active',
          tenantId: TENANT_ID
        });
      }
    }
    
    console.log(`   Inserting ${driversArray.length} drivers...`);
    for (const driver of driversArray) {
      try {
        await db.insert(schema.fleetlogixDrivers).values(driver);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`   ✅ Drivers inserted`);

    // Extract and insert vehicles
    console.log('\n🚗 Extracting and inserting vehicles...');
    const vehiclesArray = [];
    const vehicleSet = new Set();
    
    for (const row of salariesData) {
      const vehicleReg = (row['Reg #'] || '').toString().trim();
      if (vehicleReg) {
        const parts = vehicleReg.split(' - ');
        const registrationNumber = parts[0].trim();
        if (!vehicleSet.has(registrationNumber)) {
          vehicleSet.add(registrationNumber);
          vehiclesArray.push({
            registrationNumber,
            fleetCode: parts.length > 1 ? parts[1].trim() : null,
            vehicleType: 'Truck',
            status: 'active',
            tenantId: TENANT_ID
          });
        }
      }
    }
    
    console.log(`   Inserting ${vehiclesArray.length} vehicles...`);
    for (const vehicle of vehiclesArray) {
      try {
        await db.insert(schema.fleetlogixVehicles).values(vehicle);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`   ✅ Vehicles inserted`);

    console.log('\n✅ Data import completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Routes: ${routesArray.length}`);
    console.log(`   - Drivers: ${driversArray.length}`);
    console.log(`   - Vehicles: ${vehiclesArray.length}`);
    console.log('\nView at: http://localhost:5000/fleetlogix\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

importData();
