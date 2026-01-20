import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  // Find or create fleetlogix tenant
  let tenant = await client.query(`SELECT * FROM tenants WHERE subdomain = 'fleetlogix'`);
  
  if (tenant.rows.length === 0) {
    console.log('Creating fleetlogix tenant...');
    tenant = await client.query(`
      INSERT INTO tenants (id, name, subdomain, settings)
      VALUES (gen_random_uuid(), 'Fleet Logix', 'fleetlogix', '{}'::jsonb)
      RETURNING *
    `);
    console.log('✅ Tenant created:', tenant.rows[0]);
  } else {
    console.log('✅ Tenant exists:', tenant.rows[0]);
  }
  
  const tenantId = tenant.rows[0].id;
  
  // Update user tenant
  await client.query(`
    UPDATE users 
    SET tenant_id = $1
    WHERE username = 'admin@fleetlogix.co.za'
  `, [tenantId]);
  
  console.log('✅ User tenant updated');
  
  // Update fleetlogix tables tenant_id
  await client.query(`UPDATE fleetlogix_drivers SET tenant_id = $1`, [tenantId]);
  await client.query(`UPDATE fleetlogix_vehicles SET tenant_id = $1`, [tenantId]);
  await client.query(`UPDATE fleetlogix_routes SET tenant_id = $1`, [tenantId]);
  await client.query(`UPDATE fleetlogix_loads SET tenant_id = $1`, [tenantId]);
  
  console.log('✅ All records updated with correct tenant');
  
  await client.end();
}

main().catch(console.error);
