import { config } from "dotenv";
config();

import { db } from "../server/db";
import { users, tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createTestUser() {
  try {
    // Get the default tenant
    const [tenant] = await db.select().from(tenantConfig).limit(1);
    
    if (!tenant) {
      console.error('No tenant found!');
      process.exit(1);
    }
    
    console.log('Found tenant:', tenant.companyName, '(ID:', tenant.id, ')');
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, 'testuser'));
    
    if (existingUser.length > 0) {
      console.log('Test user already exists');
      process.exit(0);
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const [newUser] = await db.insert(users).values({
      username: 'testuser',
      email: 'test@fleetlogix.com',
      password: hashedPassword,
      role: 'tenant_admin',
      tenantId: tenant.id,
    }).returning();
    
    console.log('✅ Test user created:', newUser.username);
    console.log('   Email:', newUser.email);
    console.log('   Password: password123');
    console.log('   Role:', newUser.role);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

createTestUser();
