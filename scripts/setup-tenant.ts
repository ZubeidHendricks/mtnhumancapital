#!/usr/bin/env tsx
/**
 * Tenant Setup Script
 * Creates a new tenant configuration in the database
 * 
 * Usage: npx tsx scripts/setup-tenant.ts
 */

import { db } from "../server/db";
import { tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

interface TenantData {
  companyName: string;
  subdomain: string;
  primaryColor: string;
  logoUrl: string | null;
  tagline: string;
  industry: string;
  modulesEnabled: {
    recruitment: boolean;
    integrity: boolean;
    onboarding: boolean;
    hr_management: boolean;
    [key: string]: boolean;
  };
}

async function promptUser(): Promise<TenantData> {
  const rl = readline.createInterface({ input, output });

  console.log('\n🏢 Tenant Setup Wizard\n');
  console.log('This wizard will help you create a new tenant configuration.\n');

  const companyName = await rl.question('Company Name (e.g., FLEET LOGIX): ');
  const subdomain = await rl.question('Subdomain (e.g., fleetlogix): ');
  const primaryColor = await rl.question('Primary Color (hex, default #0ea5e9): ') || '#0ea5e9';
  const tagline = await rl.question('Tagline: ');
  const industry = await rl.question('Industry (e.g., Logistics & Transportation): ');
  
  console.log('\n📦 Module Configuration (y/n):\n');
  const recruitmentEnabled = (await rl.question('Enable Recruitment module? (Y/n): ')).toLowerCase() !== 'n';
  const integrityEnabled = (await rl.question('Enable Integrity Checks module? (Y/n): ')).toLowerCase() !== 'n';
  const onboardingEnabled = (await rl.question('Enable Onboarding module? (Y/n): ')).toLowerCase() !== 'n';
  const hrEnabled = (await rl.question('Enable HR Management module? (Y/n): ')).toLowerCase() !== 'n';

  rl.close();

  return {
    companyName: companyName.trim(),
    subdomain: subdomain.trim().toLowerCase(),
    primaryColor: primaryColor.trim(),
    logoUrl: null,
    tagline: tagline.trim(),
    industry: industry.trim(),
    modulesEnabled: {
      recruitment: recruitmentEnabled,
      integrity: integrityEnabled,
      onboarding: onboardingEnabled,
      hr_management: hrEnabled,
    },
  };
}

async function setupTenant(tenantData: TenantData) {
  try {
    // Check if tenant already exists
    const existing = await db.query.tenantConfig.findFirst({
      where: eq(tenantConfig.subdomain, tenantData.subdomain)
    });

    if (existing) {
      console.error(`\n❌ Error: Tenant with subdomain '${tenantData.subdomain}' already exists`);
      console.log('\nExisting tenant details:');
      console.log(`  - Company: ${existing.companyName}`);
      console.log(`  - Subdomain: ${existing.subdomain}`);
      console.log(`  - Tenant ID: ${existing.id}`);
      process.exit(1);
    }

    // Create new tenant
    const [tenant] = await db.insert(tenantConfig).values({
      companyName: tenantData.companyName,
      subdomain: tenantData.subdomain,
      primaryColor: tenantData.primaryColor,
      logoUrl: tenantData.logoUrl,
      tagline: tenantData.tagline,
      industry: tenantData.industry,
      modulesEnabled: tenantData.modulesEnabled,
      apiKeysConfigured: {},
    }).returning();

    console.log('\n✅ Tenant created successfully!\n');
    console.log('Tenant Details:');
    console.log(`  - Company Name: ${tenant.companyName}`);
    console.log(`  - Subdomain: ${tenant.subdomain}`);
    console.log(`  - Tenant ID: ${tenant.id}`);
    console.log(`  - Primary Color: ${tenant.primaryColor}`);
    console.log(`  - Industry: ${tenant.industry}`);
    console.log(`  - Tagline: ${tenant.tagline}`);
    console.log('\nEnabled Modules:');
    Object.entries(tenant.modulesEnabled as any).forEach(([module, enabled]) => {
      console.log(`  ${enabled ? '✅' : '❌'} ${module.replace('_', ' ').toUpperCase()}`);
    });
    console.log('\n📝 Next Steps:');
    console.log('  1. Create admin user: npx tsx scripts/create-admin.ts');
    console.log('  2. Upload company logo to /uploads/');
    console.log('  3. Configure API keys in tenant settings');
    console.log(`  4. Access tenant at: https://${tenant.subdomain}.yourdomain.com`);

    return tenant;
  } catch (error) {
    console.error('\n❌ Failed to create tenant:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const tenantData = await promptUser();
    
    console.log('\n📋 Review tenant configuration:');
    console.log(JSON.stringify(tenantData, null, 2));
    
    const rl = readline.createInterface({ input, output });
    const confirm = await rl.question('\nProceed with tenant creation? (y/N): ');
    rl.close();

    if (confirm.toLowerCase() !== 'y') {
      console.log('\n❌ Tenant creation cancelled');
      process.exit(0);
    }

    await setupTenant(tenantData);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
