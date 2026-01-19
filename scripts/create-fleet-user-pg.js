import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  console.log('Connected to database');
  
  const hash = await bcrypt.hash('fleet123', 10);
  
  const result = await client.query(
    `INSERT INTO users (username, email, password, role, "tenantId", "createdAt")
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (email) DO UPDATE SET password = $3
     RETURNING id, username, email`,
    ['fleetlogix_admin', 'admin@fleetlogix.co.za', hash, 'admin', 1]
  );
  
  console.log('✅ Fleet user created:', result.rows[0]);
  
  await client.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
