#!/usr/bin/env tsx
/**
 * List Tenants Script
 * Displays all configured tenants with their details
 * 
 * Usage: npx tsx scripts/list-tenants.ts
 */

import { db } from "../server/db";
import { tenantConfig, users } from "@shared/schema";
import { eq, count } from "drizzle-orm";

async function listTenants() {
  try {
    const tenants = await db.query.tenantConfig.findMany({
      orderBy: (tenantConfig, { asc }) => [asc(tenantConfig.createdAt)],
    });

    if (tenants.length === 0) {
      console.log('\n📋 No tenants found');
      console.log('Create a new tenant using: npx tsx scripts/setup-tenant.ts\n');
      return;
    }

    console.log(`\n📋 Found ${tenants.length} tenant(s):\n`);

    for (const tenant of tenants) {
      // Count users for this tenant
      const [userCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.tenantId, tenant.id));

      console.log('─'.repeat(80));
      console.log(`🏢 ${tenant.companyName}`);
      console.log('─'.repeat(80));
      console.log(`  ID:          ${tenant.id}`);
      console.log(`  Subdomain:   ${tenant.subdomain}`);
      console.log(`  Industry:    ${tenant.industry || 'Not specified'}`);
      console.log(`  Tagline:     ${tenant.tagline || 'Not specified'}`);
      console.log(`  Color:       ${tenant.primaryColor}`);
      console.log(`  Logo:        ${tenant.logoUrl || 'Not uploaded'}`);
      console.log(`  Users:       ${userCount.count}`);
      console.log(`  Created:     ${tenant.createdAt.toISOString()}`);
      
      // Display enabled modules
      const modules = tenant.modulesEnabled as Record<string, boolean>;
      console.log('\n  📦 Modules:');
      Object.entries(modules).forEach(([module, enabled]) => {
        const icon = enabled ? '✅' : '❌';
        const name = module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`     ${icon} ${name}`);
      });

      // Display API configuration status
      const apiKeys = tenant.apiKeysConfigured as Record<string, boolean>;
      if (Object.keys(apiKeys).length > 0) {
        console.log('\n  🔑 API Keys:');
        Object.entries(apiKeys).forEach(([api, configured]) => {
          const icon = configured ? '✅' : '❌';
          console.log(`     ${icon} ${api.toUpperCase()}`);
        });
      }

      console.log('');
    }

    console.log('─'.repeat(80));
    console.log('\n📝 Management Commands:');
    console.log('  - Create tenant:    npx tsx scripts/setup-tenant.ts');
    console.log('  - Create admin:     npx tsx scripts/create-admin.ts');
    console.log('  - Update tenant:    Edit via web interface or database');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error listing tenants:', error);
    throw error;
  }
}

// Main execution
listTenants()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
