import { db } from "./db";
import { tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Ensures a default tenant exists for development and initial setup
 * This prevents the app from failing when no tenant is configured
 */
export async function seedDefaultTenant() {
  try {
    // Check if 'company' tenant already exists
    const existing = await db.query.tenantConfig.findFirst({
      where: eq(tenantConfig.subdomain, 'company')
    });

    if (existing) {
      console.log('Default tenant already exists:', existing.companyName);
      return existing;
    }

    // Create default tenant
    const [defaultTenant] = await db.insert(tenantConfig).values({
      companyName: 'Avatar Human Capital',
      subdomain: 'company',
      primaryColor: '#0ea5e9',
      logoUrl: null,
      tagline: 'AI-Powered HR Management Platform',
      industry: 'Technology',
      modulesEnabled: {
        recruitment: true,
        integrity: true,
        onboarding: true,
        hr_management: true,
      },
      apiKeysConfigured: {},
    }).returning();

    console.log('✓ Default tenant seeded:', defaultTenant.companyName);
    return defaultTenant;
  } catch (error) {
    console.error('Failed to seed default tenant:', error);
    throw error;
  }
}
