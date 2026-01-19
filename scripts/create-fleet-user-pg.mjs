import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected to database');
  
  const hash = bcrypt.hashSync('fleet123', 10);
  
  const result = await client.query(
    `INSERT INTO users (id, username, password, role, tenant_id, is_super_admin)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 0)
     ON CONFLICT (username) DO UPDATE SET password = $2
     RETURNING id, username, role`,
    ['admin@fleetlogix.co.za', hash, 'admin', '1']
  );
  
  console.log('✅ Fleet user created:', result.rows[0]);
  
  await client.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
