import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  console.log('Creating Fleet Logix tables...');
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS fleetlogix_drivers (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR,
      name TEXT NOT NULL,
      id_number TEXT,
      license_number TEXT,
      license_type TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      hire_date DATE,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS fleetlogix_vehicles (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR,
      registration TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      vin TEXT,
      fleet_number TEXT,
      type TEXT,
      capacity DECIMAL(10,2),
      fuel_type TEXT,
      status TEXT DEFAULT 'active',
      purchase_date DATE,
      last_service_date DATE,
      next_service_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS fleetlogix_routes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR,
      name TEXT NOT NULL,
      origin TEXT,
      destination TEXT,
      distance DECIMAL(10,2),
      estimated_duration INTEGER,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS fleetlogix_loads (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR,
      load_number TEXT,
      driver_id VARCHAR REFERENCES fleetlogix_drivers(id),
      vehicle_id VARCHAR REFERENCES fleetlogix_vehicles(id),
      route_id VARCHAR REFERENCES fleetlogix_routes(id),
      load_date DATE,
      delivery_date DATE,
      cargo_description TEXT,
      weight DECIMAL(10,2),
      revenue DECIMAL(10,2),
      expenses DECIMAL(10,2),
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  console.log('✅ Tables created successfully');
  
  await client.end();
}

main().catch(console.error);
