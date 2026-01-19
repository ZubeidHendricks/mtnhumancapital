import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  const schema = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tenant_config'
    ORDER BY ordinal_position
  `);
  
  console.log('tenant_config columns:');
  schema.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
  
  const data = await client.query(`SELECT * FROM tenant_config LIMIT 5`);
  console.log('\nExisting records:', data.rows.length);
  if (data.rows.length > 0) {
    console.log(JSON.stringify(data.rows[0], null, 2));
  }
  
  await client.end();
}

main().catch(console.error);
