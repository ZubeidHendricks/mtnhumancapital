import XLSX from 'xlsx';
import { db } from './server/db';
import {
  fleetlogixDrivers,
  fleetlogixVehicles,
  fleetlogixRoutes,
  fleetlogixLoads,
} from '@shared/schema';
import { eq } from 'drizzle-orm';

const TENANT_ID = '1580efd0-8445-4afb-b961-d20ca180246b'; // admin@fleetlogix.co.za

interface DriverSalaryRow {
  DRIVER?: string;
  'LOAD DATE'?: any;
  ROUTE?: string;
  VEHICLE?: string;
  'TONNAGE B'?: number;
  'TONNAGE W'?: number;
  DISTANCE?: number;
  'RATE R/KM'?: number;
  AMOUNT?: number;
  'PUBLIC HOLIDAY'?: string;
}

interface LoadReconRow {
  'LOAD DATE'?: any;
  'LOADING POINT'?: string;
  DESTINATION?: string;
  DISTANCE?: number;
  'NORMAL RATE'?: number;
  'HOLIDAY RATE'?: number;
  'NORMAL AMOUNT'?: number;
  'HOLIDAY AMOUNT'?: number;
  'TICKET # B'?: string;
  'TICKET # W'?: string;
  'TONNAGE B'?: number;
  'TONNAGE W'?: number;
  DRIVER?: string;
  VEHICLE?: string;
  RATE?: number;
  AMOUNT?: number;
  'PUBLIC HOLIDAY'?: string;
}

async function importFleetLogixData() {
  try {
    console.log('Starting FleetLogix data import...\n');

    // Read the Excel files
    console.log('Reading Excel files...');
    const salariesWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx');
    const loadReconWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');

    // Get the Data sheet from each workbook
    const salariesSheet = salariesWorkbook.Sheets['Data'];
    const loadReconSheet = loadReconWorkbook.Sheets['Data'];

    // Convert to JSON
    const salariesData: any[] = XLSX.utils.sheet_to_json(salariesSheet);
    const loadReconData: any[] = XLSX.utils.sheet_to_json(loadReconSheet);

    console.log(`✓ Found ${salariesData.length} salary records`);
    console.log(`✓ Found ${loadReconData.length} load reconciliation records\n`);

    // Extract unique drivers
    const driverNames = new Set<string>();
    salariesData.forEach(row => row['Driver Name'] && driverNames.add(row['Driver Name'].trim()));
    loadReconData.forEach(row => row['Driver Name'] && driverNames.add(row['Driver Name'].trim()));

    // Extract unique vehicles
    const vehicleRegs = new Set<string>();
    salariesData.forEach(row => row['Reg #'] && vehicleRegs.add(row['Reg #'].trim()));
    loadReconData.forEach(row => row['Reg #'] && vehicleRegs.add(row['Reg #'].trim()));

    // Extract unique routes
    const routeMap = new Map<string, { route: string; distance: number; normalRate?: number; holidayRate?: number }>();
    [...salariesData, ...loadReconData].forEach(row => {
      if (row.Route && row['Distance (Km)']) {
        const routeParts = row.Route.split('-').map((p: string) => p.trim());
        if (routeParts.length >= 2) {
          const key = row.Route.trim();
          if (!routeMap.has(key)) {
            routeMap.set(key, {
              route: row.Route.trim(),
              distance: row['Distance (Km)'],
              normalRate: row['Normal Rate Per  Kilometer      '],
              holidayRate: row[' Sunday & Holiday Rate'] || row[' Sunday &Holiday Rate'],
            });
          }
        }
      }
    });

    console.log(`Found ${driverNames.size} unique drivers`);
    console.log(`Found ${vehicleRegs.size} unique vehicles`);
    console.log(`Found ${routeMap.size} unique routes\n`);

    // Clear existing data for this tenant
    console.log('Clearing existing data...');
    await db.delete(fleetlogixLoads).where(eq(fleetlogixLoads.tenantId, TENANT_ID));
    await db.delete(fleetlogixRoutes).where(eq(fleetlogixRoutes.tenantId, TENANT_ID));
    await db.delete(fleetlogixVehicles).where(eq(fleetlogixVehicles.tenantId, TENANT_ID));
    await db.delete(fleetlogixDrivers).where(eq(fleetlogixDrivers.tenantId, TENANT_ID));
    console.log('✓ Cleared existing data\n');

    // Import Drivers
    console.log('Importing drivers...');
    const driverMap = new Map<string, string>();
    for (const driverName of Array.from(driverNames)) {
      const [driver] = await db.insert(fleetlogixDrivers).values({
        name: driverName,
        status: 'active',
        tenantId: TENANT_ID,
      }).returning();
      driverMap.set(driverName, driver.id);
    }
    console.log(`✓ Imported ${driverMap.size} drivers\n`);

    // Import Vehicles
    console.log('Importing vehicles...');
    const vehicleMap = new Map<string, string>();
    let vehicleCount = 1;
    for (const vehicleReg of Array.from(vehicleRegs)) {
      const [vehicle] = await db.insert(fleetlogixVehicles).values({
        registration: vehicleReg,
        fleetNumber: `TRK${String(vehicleCount).padStart(3, '0')}`,
        type: 'Truck',
        capacity: '30',
        status: 'active',
        tenantId: TENANT_ID,
      }).returning();
      vehicleMap.set(vehicleReg, vehicle.id);
      vehicleCount++;
    }
    console.log(`✓ Imported ${vehicleMap.size} vehicles\n`);

    // Import Routes
    console.log('Importing routes...');
    const routeDbMap = new Map<string, string>();
    for (const [key, routeData] of routeMap) {
      const routeParts = routeData.route.split('-').map(p => p.trim());
      const origin = routeParts[0] || '';
      const destination = routeParts[1] || '';

      const [route] = await db.insert(fleetlogixRoutes).values({
        name: routeData.route,
        origin,
        destination,
        distance: String(routeData.distance),
        status: 'active',
        tenantId: TENANT_ID,
      }).returning();
      routeDbMap.set(key, route.id);
    }
    console.log(`✓ Imported ${routeDbMap.size} routes\n`);

    // Import Loads from Load Recon data
    console.log('Importing loads...');
    let loadCount = 0;
    for (const row of loadReconData) {
      if (!row['Driver Name'] || !row['Reg #']) continue;

      const routeKey = row.Route ? row.Route.trim() : null;
      const loadDate = row['Dates - 2025'] ? excelDateToJSDate(row['Dates - 2025']) : new Date();

      await db.insert(fleetlogixLoads).values({
        loadNumber: `LOAD-${loadDate.toISOString().split('T')[0]}-${loadCount + 1}`,
        loadDate: loadDate.toISOString().split('T')[0],
        routeId: routeKey ? routeDbMap.get(routeKey) : null,
        vehicleId: vehicleMap.get(row['Reg #'].trim()),
        driverId: driverMap.get(row['Driver Name'].trim()),
        weight: row['Distance (Km)'] ? String(row['Distance (Km)']) : null,
        revenue: row.Rate ? String(row.Rate) : null,
        status: 'delivered',
        tenantId: TENANT_ID,
      });
      loadCount++;
    }
    console.log(`✓ Imported ${loadCount} loads\n`);

    console.log('✅ FleetLogix data import complete!\n');
    console.log('Summary:');
    console.log(`  - Drivers: ${driverMap.size}`);
    console.log(`  - Vehicles: ${vehicleMap.size}`);
    console.log(`  - Routes: ${routeDbMap.size}`);
    console.log(`  - Loads: ${loadCount}`);

  } catch (error) {
    console.error('Error importing FleetLogix data:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Helper function to convert Excel date serial to JS Date
function excelDateToJSDate(serial: any): Date {
  if (serial instanceof Date) return serial;
  if (typeof serial === 'string') return new Date(serial);
  
  // Excel dates are stored as number of days since 1900-01-01
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

importFleetLogixData();
