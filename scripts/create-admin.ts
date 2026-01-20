#!/usr/bin/env tsx
/**
 * Admin User Creation Script
 * Creates an admin user for a tenant
 * 
 * Usage: npx tsx scripts/create-admin.ts
 */

import { db } from "../server/db";
import { users, tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

async function listTenants() {
  const tenants = await db.query.tenantConfig.findMany();
  
  if (tenants.length === 0) {
    console.log('\n❌ No tenants found. Create a tenant first using: npx tsx scripts/setup-tenant.ts');
    process.exit(1);
  }

  console.log('\n📋 Available Tenants:\n');
  tenants.forEach((tenant, index) => {
    console.log(`${index + 1}. ${tenant.companyName} (${tenant.subdomain})`);
    console.log(`   ID: ${tenant.id}`);
  });
  console.log('');

  return tenants;
}

async function createAdmin() {
  try {
    const tenants = await listTenants();
    const rl = readline.createInterface({ input, output });

    console.log('🔐 Admin User Creation Wizard\n');

    // Select tenant
    const tenantIndex = await rl.question('Select tenant number: ');
    const selectedTenant = tenants[parseInt(tenantIndex) - 1];

    if (!selectedTenant) {
      console.error('\n❌ Invalid tenant selection');
      rl.close();
      process.exit(1);
    }

    console.log(`\n✓ Selected: ${selectedTenant.companyName}\n`);

    // Get admin details
    const username = await rl.question('Admin username: ');
    const password = await rl.question('Admin password (min 8 chars): ');
    
    rl.close();

    // Validate password
    if (password.length < 8) {
      console.error('\n❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    // Check if username exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username.trim())
    });

    if (existingUser) {
      console.error(`\n❌ Username '${username}' already exists`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const [admin] = await db.insert(users).values({
      tenantId: selectedTenant.id,
      username: username.trim(),
      password: hashedPassword,
      role: 'tenant_admin',
      isSuperAdmin: 0,
    }).returning();

    console.log('\n✅ Admin user created successfully!\n');
    console.log('Admin User Details:');
    console.log(`  - Username: ${admin.username}`);
    console.log(`  - Tenant: ${selectedTenant.companyName}`);
    console.log(`  - Role: ${admin.role}`);
    console.log(`  - User ID: ${admin.id}`);
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!\n');
    console.log('📝 Next Steps:');
    console.log('  1. Login to the platform');
    console.log('  2. Change password immediately after first login');
    console.log('  3. Configure tenant settings and branding');
    console.log('  4. Create additional users as needed');

  } catch (error) {
    console.error('\n❌ Failed to create admin user:', error);
    throw error;
  }
}

// Main execution
createAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
