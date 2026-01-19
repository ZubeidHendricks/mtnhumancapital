import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  const result = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);
  console.log('Users table columns:');
  result.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
  await client.end();
}

main().catch(console.error);
