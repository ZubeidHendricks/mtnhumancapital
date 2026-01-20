# Tenant Module Control Guide

## Overview
The AvatarHumanCapital platform uses a multi-tenant architecture where each tenant (company) can have different modules enabled or disabled. This allows for flexible subscription plans and feature access control.

## How Module Control Works

### 1. Database Schema
Modules are controlled through the `tenant_config` table which includes:
```sql
-- Located in: shared/schema.ts (line 286-298)
modulesEnabled: jsonb("modules_enabled").notNull().default(sql`'{}'::jsonb`)
```

This field stores a JSON object with module keys and boolean values:
```json
{
  "recruitment": true,
  "integrity": true,
  "onboarding": true,
  "hr_management": true,
  "fleetlogix": false,
  "workforce_intelligence": true,
  "lms": false
}
```

### 2. Valid Module Keys
The following modules can be controlled (defined in `server/routes.ts`):
- `recruitment` - Recruitment and candidate management
- `integrity` - Background checks and integrity verification
- `onboarding` - Employee onboarding workflows
- `hr_management` - HR and workforce management
- `fleetlogix` - Fleet management system
- `workforce_intelligence` - Skills and workforce analytics
- `lms` - Learning Management System
- `kpi_performance` - KPI and performance review system
- `social_screening` - Social media screening
- `document_automation` - Document processing and automation
- `whatsapp` - WhatsApp integration

### 3. Enabling/Disabling Modules

#### Via API (Admin/Super Admin)

**Update tenant modules:**
```bash
PATCH /api/admin/tenants/:id/modules
Content-Type: application/json

{
  "modulesEnabled": {
    "recruitment": true,
    "lms": true,
    "fleetlogix": false
  }
}
```

**Update tenant config:**
```bash
PATCH /api/tenant-config/:id
Content-Type: application/json

{
  "modulesEnabled": {
    "recruitment": true,
    "integrity": true,
    "onboarding": true,
    "hr_management": false
  }
}
```

#### Via Database
```sql
-- Enable a module
UPDATE tenant_config 
SET modules_enabled = jsonb_set(
  COALESCE(modules_enabled, '{}'::jsonb),
  '{lms}',
  'true'::jsonb
)
WHERE subdomain = 'company';

-- Disable a module
UPDATE tenant_config 
SET modules_enabled = jsonb_set(
  COALESCE(modules_enabled, '{}'::jsonb),
  '{fleetlogix}',
  'false'::jsonb
)
WHERE subdomain = 'company';

-- Enable multiple modules
UPDATE tenant_config 
SET modules_enabled = '{
  "recruitment": true,
  "integrity": true,
  "onboarding": true,
  "lms": true,
  "fleetlogix": true
}'::jsonb
WHERE subdomain = 'company';
```

### 4. Checking Module Access

#### Server-side (Middleware)
```typescript
// In route handlers
if (!req.tenant.modulesEnabled?.fleetlogix) {
  return res.status(403).json({ 
    error: 'FleetLogix module not enabled for this tenant' 
  });
}
```

#### Client-side (React Hooks)
```typescript
import { useTenant } from '@/hooks/useTenant';

function MyComponent() {
  const { isModuleEnabled } = useTenant();
  
  if (!isModuleEnabled('lms')) {
    return <div>LMS module not available</div>;
  }
  
  return <div>LMS Content</div>;
}
```

### 5. Tenant Resolution
Tenants are resolved via subdomain:
- **Development**: `localhost?tenant=company` or default to 'company'
- **Production**: `company.ahc.com` extracts 'company' as subdomain

The tenant middleware (`server/tenant-middleware.ts`) automatically:
1. Extracts subdomain from hostname
2. Looks up tenant config from database
3. Attaches tenant object to `req.tenant`
4. Makes tenant available to all routes

### 6. Default Module Configuration

**New tenant creation:**
```typescript
// Default modules for new tenants
{
  modulesEnabled: {
    recruitment: true,
    integrity: true,
    onboarding: true,
    hr_management: true
  }
}
```

### 7. Module Access in UI

The UI automatically checks module access:
```typescript
// In navigation components
const { isModuleEnabled } = useTenant();

const navigationItems = [
  {
    title: 'Recruitment',
    href: '/recruitment',
    visible: isModuleEnabled('recruitment')
  },
  {
    title: 'FleetLogix',
    href: '/fleetlogix',
    visible: isModuleEnabled('fleetlogix')
  },
  // ... more items
];
```

### 8. API Endpoints

**Get tenant config:**
```bash
GET /api/tenant-config
```

**Update modules (Admin only):**
```bash
PATCH /api/admin/tenants/:id/modules
```

**Get all tenants (Super Admin):**
```bash
GET /api/admin/tenants
```

## Common Scenarios

### Scenario 1: Enable FleetLogix for a tenant
```typescript
// Via API
await fetch('/api/tenant-config/TENANT_ID', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modulesEnabled: {
      fleetlogix: true
    }
  })
});
```

### Scenario 2: Check if module is enabled before accessing
```typescript
// Server-side route
app.get('/api/fleetlogix/drivers', requireAuth, async (req, res) => {
  if (!req.tenant.modulesEnabled?.fleetlogix) {
    return res.status(403).json({ 
      error: 'FleetLogix module not enabled' 
    });
  }
  
  // Proceed with request...
});
```

### Scenario 3: Conditionally render UI based on modules
```typescript
function Dashboard() {
  const { isModuleEnabled } = useTenant();
  
  return (
    <div>
      {isModuleEnabled('recruitment') && <RecruitmentWidget />}
      {isModuleEnabled('lms') && <LMSWidget />}
      {isModuleEnabled('fleetlogix') && <FleetLogixWidget />}
    </div>
  );
}
```

## Best Practices

1. **Always check module access** both on client and server side
2. **Use the `useTenant()` hook** for consistent module checking in React
3. **Validate module keys** when updating tenant config
4. **Default to false** if module key doesn't exist
5. **Use middleware** for route-level module access control
6. **Store boolean values** in modulesEnabled (not strings)
7. **Update updatedAt** timestamp when changing modules

## Module Dependencies

Some modules may depend on others:
- `onboarding` → requires `recruitment` and `integrity`
- `workforce_intelligence` → requires `hr_management`
- `kpi_performance` → requires `hr_management`

## Security Notes

- Module access is controlled at the **tenant level**, not user level
- **Super admins** can modify any tenant's modules
- **Tenant admins** cannot modify their own modules (requires super admin)
- Module checks should be done on **both client and server** for security
- Tenant resolution happens **before authentication** in middleware chain

## Files Reference

- Schema: `shared/schema.ts` (line 286-298)
- Tenant Middleware: `server/tenant-middleware.ts`
- Storage Layer: `server/storage.ts` (`updateTenantModules()`)
- Routes: `server/routes.ts` (module validation and endpoints)
- React Hook: `client/src/hooks/useTenant.ts`
- Seeding: `server/seed-default-tenant.ts`

## Quick Commands

```bash
# View current modules for a tenant
psql $DATABASE_URL -c "SELECT subdomain, modules_enabled FROM tenant_config WHERE subdomain='company';"

# Enable all modules for default tenant
psql $DATABASE_URL -c "UPDATE tenant_config SET modules_enabled = '{\"recruitment\": true, \"integrity\": true, \"onboarding\": true, \"hr_management\": true, \"lms\": true, \"fleetlogix\": true, \"workforce_intelligence\": true}'::jsonb WHERE subdomain='company';"

# Check which tenants have FleetLogix enabled
psql $DATABASE_URL -c "SELECT subdomain, company_name, modules_enabled->'fleetlogix' as fleetlogix_enabled FROM tenant_config;"
```
