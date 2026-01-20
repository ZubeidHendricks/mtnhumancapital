import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  const drivers = await client.query('SELECT COUNT(*) FROM fl_drivers');
  const vehicles = await client.query('SELECT COUNT(*) FROM fl_vehicles');  
  const routes = await client.query('SELECT COUNT(*) FROM fl_routes');
  
  console.log('✅ Fleet Logix Data:');
  console.log(`   Drivers: ${drivers.rows[0].count}`);
  console.log(`   Vehicles: ${vehicles.rows[0].count}`);
  console.log(`   Routes: ${routes.rows[0].count}`);
  
  await client.end();
}

main().catch(console.error);
