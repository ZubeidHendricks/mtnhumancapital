import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  // Create fleetlogix tenant config
  const tenant = await client.query(`
    INSERT INTO tenant_config (id, company_name, subdomain, primary_color, industry, modules_enabled, api_keys_configured)
    VALUES (gen_random_uuid(), 'Fleet Logix', 'fleetlogix', '#10B981', 'Logistics', 
            '{"fleetlogix": true}'::jsonb, '{}'::jsonb)
    ON CONFLICT (subdomain) DO UPDATE 
    SET company_name = 'Fleet Logix', modules_enabled = '{"fleetlogix": true}'::jsonb
    RETURNING *
  `);
  
  console.log('✅ Tenant config created:', tenant.rows[0]);
  
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
