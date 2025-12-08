import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend Express Request to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant: typeof tenantConfig.$inferSelect;
    }
  }
}

/**
 * Middleware to resolve subdomain to tenant and attach to req.tenant
 * For local development, also supports ?tenant=subdomain query parameter
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    let subdomain: string | null = null;

    // Extract subdomain from hostname (e.g., acme.ahc.com -> acme)
    const hostname = req.hostname;
    const parts = hostname.split('.');
    
    // Handle different scenarios:
    // - localhost -> use query param or default to 'company'
    // - subdomain.domain.com -> use subdomain
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.endsWith('.replit.dev')) {
      // Development: allow ?tenant=subdomain override
      subdomain = (req.query.tenant as string) || 'company';
    } else if (parts.length >= 3) {
      // Production: extract subdomain from hostname
      subdomain = parts[0];
    } else {
      // Default subdomain for production domains without subdomain (e.g., avatarhuman.capital)
      subdomain = 'company';
    }

    // Look up tenant by subdomain
    const tenant = await db.query.tenantConfig.findFirst({
      where: eq(tenantConfig.subdomain, subdomain)
    });

    if (!tenant) {
      return res.status(404).json({ 
        error: 'Tenant not found', 
        subdomain,
        message: `No tenant found for subdomain: ${subdomain}` 
      });
    }

    // Attach tenant to request
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
}

/**
 * Middleware to allow super admins to override tenant via header
 * This should only be used after authentication middleware
 */
export async function allowTenantOverride(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is super admin (you'll need to implement this based on your auth)
    // For now, we'll skip this and use the tenant from resolveTenant
    // TODO: Implement after authentication is in place
    next();
  } catch (error) {
    console.error('Error in tenant override:', error);
    next();
  }
}
