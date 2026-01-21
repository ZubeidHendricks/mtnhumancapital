/**
 * One-time script to seed Fleet Logix data in production database
 * 
 * Usage: Set PRODUCTION_DATABASE_URL environment variable and run:
 *   npx tsx scripts/seed-production-db.ts
 * 
 * Example:
 *   PRODUCTION_DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require" npx tsx scripts/seed-production-db.ts
 */

import { Pool } from 'pg';

const PRODUCTION_DATABASE_URL = process.env.PRODUCTION_DATABASE_URL;

if (!PRODUCTION_DATABASE_URL) {
  console.error('Error: PRODUCTION_DATABASE_URL environment variable is required');
  console.log('Usage: PRODUCTION_DATABASE_URL="postgresql://..." npx tsx scripts/seed-production-db.ts');
  process.exit(1);
}

// Disable SSL certificate validation for DigitalOcean managed database
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: PRODUCTION_DATABASE_URL,
  ssl: true
});

async function seedFleetLogix() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to production database...');
    
    // First, list all tables to understand the schema
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Available tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    // Find Fleet Logix tenant - try different table names
    let tenantResult;
    try {
      tenantResult = await client.query(`
        SELECT id, company_name FROM tenant_config 
        WHERE company_name ILIKE '%fleet%' OR company_name ILIKE '%logix%'
        LIMIT 1
      `);
    } catch (e) {
      // Try alternative table name
      try {
        tenantResult = await client.query(`
          SELECT id, name as company_name FROM tenants 
          WHERE name ILIKE '%fleet%' OR name ILIKE '%logix%'
          LIMIT 1
        `);
      } catch (e2) {
        console.log('Could not find tenant table. Available tables listed above.');
        console.log('Please provide the correct tenant ID manually.');
        return;
      }
    }
    
    if (tenantResult.rows.length === 0) {
      console.error('No Fleet Logix tenant found in production database');
      return;
    }
    
    const tenantId = tenantResult.rows[0].id;
    console.log(`Found Fleet Logix tenant: ${tenantResult.rows[0].company_name} (${tenantId})`);
    
    // Routes data
    const routes = [
      { name: 'Exxaro Leeuwpan - Sasol Bosjesspruit', origin: 'Exxaro Leeuwpan', destination: 'Sasol Bosjesspruit', distance: 102 },
      { name: 'Exxaro Leeuwpan - Sasol Site 1', origin: 'Exxaro Leeuwpan', destination: 'Sasol Site 1', distance: 85 },
      { name: 'Kleinfontein - Arnot', origin: 'Kleinfontein', destination: 'Arnot', distance: 145 },
      { name: 'Leeuwport Mine - Lk Tlou', origin: 'Leeuwport Mine', destination: 'Lk Tlou', distance: 29 },
      { name: 'Lk Tlou - Middelbult', origin: 'Lk Tlou', destination: 'Middelbult', distance: 70 },
      { name: 'Lk Tlou - Sasol Bosjesspruit', origin: 'Lk Tlou', destination: 'Sasol Bosjesspruit', distance: 85 },
      { name: 'Lk Tlou - Sasol Impumelelo', origin: 'Lk Tlou', destination: 'Sasol Impumelelo', distance: 73 },
      { name: 'Lk Tlou - Shondoni', origin: 'Lk Tlou', destination: 'Shondoni', distance: 58 },
      { name: 'LK Tlou - Arnot', origin: 'LK Tlou', destination: 'Arnot', distance: 145 },
      { name: 'LK Tlou - Kleinfontein', origin: 'LK Tlou', destination: 'Kleinfontein', distance: 110 },
      { name: 'LK Tlou - Hendrina', origin: 'LK Tlou', destination: 'Hendrina', distance: 136 },
      { name: 'Matsambisa Kriel - Arnot', origin: 'Matsambisa Kriel', destination: 'Arnot', distance: 126 },
      { name: 'Matsambisa Kriel - Hendrina Power', origin: 'Matsambisa Kriel', destination: 'Hendrina Power', distance: 122 },
      { name: 'Matsambisa Kriel - Resinga', origin: 'Matsambisa Kriel', destination: 'Resinga', distance: 96 },
      { name: 'Mavungwani - Duvha Power Station', origin: 'Mavungwani', destination: 'Duvha Power Station', distance: 82 },
      { name: 'Mavungwani - Hendrina Power', origin: 'Mavungwani', destination: 'Hendrina Power', distance: 47 },
      { name: 'Mavungwani - Matla Power', origin: 'Mavungwani', destination: 'Matla Power', distance: 108 },
      { name: 'Resinga Mine - Arnot', origin: 'Resinga Mine', destination: 'Arnot', distance: 52 },
      { name: 'Resinga Mine - Camden', origin: 'Resinga Mine', destination: 'Camden', distance: 62 },
      { name: 'Resinga Mine - Matla', origin: 'Resinga Mine', destination: 'Matla', distance: 105 },
    ];

    console.log('Inserting routes...');
    for (const route of routes) {
      try {
        await client.query(`
          INSERT INTO fleetlogix_routes (id, tenant_id, name, origin, destination, distance, status, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [tenantId, route.name, route.origin, route.destination, route.distance]);
      } catch (e) { /* Skip duplicates */ }
    }
    console.log(`Inserted ${routes.length} routes`);

    // Vehicles data
    const vehicles = [
      { registration: 'KX31ZLGP - FL04', fleetNumber: 'FL04' },
      { registration: 'KX31ZNGP - FL09', fleetNumber: 'FL09' },
      { registration: 'KX31ZSGP - FL25', fleetNumber: 'FL25' },
      { registration: 'KX32BVGP - FL23', fleetNumber: 'FL23' },
      { registration: 'KX32CMGP - FL10', fleetNumber: 'FL10' },
      { registration: 'KX32CXGP - FL14', fleetNumber: 'FL14' },
      { registration: 'KX32DBGP - FL12', fleetNumber: 'FL12' },
      { registration: 'LC18JZGP - FL29', fleetNumber: 'FL29' },
      { registration: 'LC18KGGP - FL27', fleetNumber: 'FL27' },
      { registration: 'LC18KPGP - FL05', fleetNumber: 'FL05' },
      { registration: 'LC18KWGP - FL06', fleetNumber: 'FL06' },
      { registration: 'LC18KZGP - FL17', fleetNumber: 'FL17' },
      { registration: 'LC18LFGP - FL08', fleetNumber: 'FL08' },
      { registration: 'LC18LKGP - FL02', fleetNumber: 'FL02' },
      { registration: 'LC18LTGP - FL30', fleetNumber: 'FL30' },
      { registration: 'LG23HJGP - FL19', fleetNumber: 'FL19' },
      { registration: 'LG23HTGP - FL15', fleetNumber: 'FL15' },
      { registration: 'LG23KSGP - FL28', fleetNumber: 'FL28' },
      { registration: 'LG23MCGP - FL26', fleetNumber: 'FL26' },
      { registration: 'LG24BKGP - FL24', fleetNumber: 'FL24' },
      { registration: 'LG24BXGP - FL16', fleetNumber: 'FL16' },
      { registration: 'LG24CDGP - FL22', fleetNumber: 'FL22' },
      { registration: 'LG24CKGP - FL21', fleetNumber: 'FL21' },
      { registration: 'LG24GBGP - FL20', fleetNumber: 'FL20' },
      { registration: 'LG24GGGP - FL03', fleetNumber: 'FL03' },
      { registration: 'LG24GMGP - FL01', fleetNumber: 'FL01' },
      { registration: 'LG24GXGP - FL11', fleetNumber: 'FL11' },
      { registration: 'LG24HFGP - FL07', fleetNumber: 'FL07' },
      { registration: 'LG24HKGP - FL31', fleetNumber: 'FL31' },
      { registration: 'LG29CZGP - FL18', fleetNumber: 'FL18' },
      { registration: 'KX31ZJGP - FL13', fleetNumber: 'FL13' },
    ];

    console.log('Inserting vehicles...');
    for (const vehicle of vehicles) {
      try {
        await client.query(`
          INSERT INTO fleetlogix_vehicles (id, tenant_id, registration, fleet_number, type, capacity, status, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, 'Truck', 34, 'active', NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [tenantId, vehicle.registration, vehicle.fleetNumber]);
      } catch (e) { /* Skip duplicates */ }
    }
    console.log(`Inserted ${vehicles.length} vehicles`);

    // Drivers data
    const drivers = [
      'Ayanda Tembe', 'Meshack Khathide', 'Sihle Thabo Nkosi', 'Sandile Peter Nzimande',
      'Witness Nkosi', 'Themba Simelane', 'Welcome Mashaya', 'Production Mthethwa',
      'Bhekinkozi Ismael Zwane', 'Siphesihle Xaba', 'Albert Mduduzi Zikalala', 'Sandiso Siyaya',
      'Nkosenhle Ndlovu', 'Lennox Banele Ncanazo', 'Sammy Mahlangu', 'Xolani Ngcobo',
      'Melizwe Siyaya', 'Nkosivumile Luphuzi', 'Dumusani Masilela', 'Khanyisani Lembethe',
      'Vincent Nkosi', 'Mlungisi Nkambula', 'Zamani Buthelezi', 'Wonder Innocent Kubheka',
      'Thabani Mpungose', 'Phumlani Simo Mthethwa', 'Jabulani Buthelezi', 'Mandla Frans Khumalo',
      'Sbusiso Samson Kubheka', 'Happy Mashilwane', 'Bongani Mnisi', 'Thulani Victor Magagula',
      'Nhlanhla Mafutha Myeni', 'Wonderful Sandile Qwabe', 'Bheki Zulu', 'Siswe Zwane',
      'Sakhile Freedom Mabaso', 'Thulani Sabelo Simelane', 'Musa Zwane', 'Sipho Nkosi'
    ];

    console.log('Inserting drivers...');
    for (const name of drivers) {
      try {
        await client.query(`
          INSERT INTO fleetlogix_drivers (id, tenant_id, name, status, salary_period, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, 'active', 'monthly', NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [tenantId, name]);
      } catch (e) { /* Skip duplicates */ }
    }
    console.log(`Inserted ${drivers.length} drivers`);

    // Get created resources for sample loads
    const driversResult = await client.query('SELECT id FROM fleetlogix_drivers WHERE tenant_id = $1', [tenantId]);
    const vehiclesResult = await client.query('SELECT id FROM fleetlogix_vehicles WHERE tenant_id = $1', [tenantId]);
    const routesResult = await client.query('SELECT id FROM fleetlogix_routes WHERE tenant_id = $1', [tenantId]);

    if (driversResult.rows.length > 0 && vehiclesResult.rows.length > 0 && routesResult.rows.length > 0) {
      console.log('Inserting loads...');
      for (let i = 0; i < Math.min(30, driversResult.rows.length); i++) {
        try {
          const loadDate = new Date();
          loadDate.setDate(loadDate.getDate() - i);
          const dateStr = loadDate.toISOString().split('T')[0];
          
          await client.query(`
            INSERT INTO fleetlogix_loads (id, tenant_id, load_number, driver_id, vehicle_id, route_id, load_date, weight, revenue, status, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'delivered', NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [
            tenantId,
            `LOAD-${dateStr}-${i + 1}`,
            driversResult.rows[i % driversResult.rows.length].id,
            vehiclesResult.rows[i % vehiclesResult.rows.length].id,
            routesResult.rows[i % routesResult.rows.length].id,
            dateStr,
            (30 + Math.random() * 10).toFixed(2),
            (80 + Math.random() * 150).toFixed(2)
          ]);
        } catch (e) { /* Skip duplicates */ }
      }
      console.log('Inserted 30 loads');
    }

    // Show final counts
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM fleetlogix_routes WHERE tenant_id = $1) as routes,
        (SELECT COUNT(*) FROM fleetlogix_vehicles WHERE tenant_id = $1) as vehicles,
        (SELECT COUNT(*) FROM fleetlogix_drivers WHERE tenant_id = $1) as drivers,
        (SELECT COUNT(*) FROM fleetlogix_loads WHERE tenant_id = $1) as loads
    `, [tenantId]);

    console.log('\n=== Seeding Complete ===');
    console.log(`Routes: ${counts.rows[0].routes}`);
    console.log(`Vehicles: ${counts.rows[0].vehicles}`);
    console.log(`Drivers: ${counts.rows[0].drivers}`);
    console.log(`Loads: ${counts.rows[0].loads}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedFleetLogix();
