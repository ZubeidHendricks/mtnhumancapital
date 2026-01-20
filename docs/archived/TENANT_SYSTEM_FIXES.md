# Tenant Onboarding System - Issues & Fixes

## 🐛 Issues Found

### 1. **Tenant Context Endpoint Mismatch**
**Problem**: Frontend requests `/api/tenant/current` but backend doesn't have this endpoint
- `client/src/contexts/TenantContext.tsx:25` requests `/api/tenant/current`
- Backend only has `/api/tenant-config` (no `/api/tenant/current`)

**Impact**: Frontend can't load tenant configuration, branding doesn't apply

---

### 2. **Tenant Resolution Not Scoped to Tenant**
**Problem**: `storage.getTenantConfig()` doesn't filter by tenant ID
```typescript
// Current (WRONG):
async getTenantConfig(): Promise<TenantConfig | undefined> {
  const [config] = await db.select().from(tenantConfig)
    .orderBy(desc(tenantConfig.createdAt)).limit(1);
  return config || undefined;
}
```
This returns the FIRST tenant config regardless of which tenant is accessing.

**Impact**: All tenants get the same config (first one created)

---

### 3. **Missing Tenant-Scoped Storage Methods**
**Problem**: Interface has no tenant parameter:
```typescript
getTenantConfig(): Promise<TenantConfig | undefined>;
```

Should be:
```typescript
getTenantConfig(tenantId: string): Promise<TenantConfig | undefined>;
getTenantConfigBySubdomain(subdomain: string): Promise<TenantConfig | undefined>;
```

---

### 4. **Middleware Applied Too Early**
**Problem**: Tenant middleware is applied to ALL `/api/*` routes including onboarding
```typescript
// server/index.ts:166
app.use('/api', resolveTenant);
```

When new company tries to onboard at `/customer-onboarding`, they POST to `/api/tenant-config` but middleware tries to resolve a tenant that doesn't exist yet.

---

### 5. **Onboarding Creates Config Without TenantId**
**Problem**: `POST /api/tenant-config` accepts data but doesn't link to tenant properly
```typescript
// routes.ts:2348
app.post("/api/tenant-config", async (req, res) => {
  const config = await storage.createTenantConfig(req.body);
  // No tenantId validation or linking
});
```

---

### 6. **Tenant Middleware Uses Wrong Field**
**Problem**: Middleware looks up by `subdomain` but stores tenant in `req.tenant`:
```typescript
// tenant-middleware.ts:42-44
const tenant = await db.query.tenantConfig.findFirst({
  where: eq(tenantConfig.subdomain, subdomain)
});
req.tenant = tenant; // Type mismatch - tenant is TenantConfig, not what routes expect
```

Routes expect `req.tenant.id` to be the tenantId string for data isolation.

---

## ✅ Fixes Required

### Fix 1: Add Missing Endpoint
**File**: `server/routes.ts`

Add after line 2321:
```typescript
// Get current tenant config (resolves from middleware)
app.get("/api/tenant/current", async (req, res) => {
  try {
    // req.tenant is set by tenant middleware
    if (!req.tenant) {
      return res.status(404).json({ message: "No tenant found" });
    }
    res.json(req.tenant);
  } catch (error) {
    console.error("Error fetching current tenant:", error);
    res.status(500).json({ message: "Failed to fetch tenant" });
  }
});
```

---

### Fix 2: Make Tenant Methods Tenant-Aware
**File**: `server/storage.ts`

Update interface:
```typescript
getTenantConfig(tenantId: string): Promise<TenantConfig | undefined>;
getTenantConfigBySubdomain(subdomain: string): Promise<TenantConfig | undefined>;
getTenantConfigById(id: string): Promise<TenantConfig | undefined>;
```

Update implementations:
```typescript
async getTenantConfig(tenantId: string): Promise<TenantConfig | undefined> {
  const [config] = await db
    .select()
    .from(tenantConfig)
    .where(eq(tenantConfig.id, tenantId))
    .limit(1);
  return config || undefined;
}

async getTenantConfigBySubdomain(subdomain: string): Promise<TenantConfig | undefined> {
  const [config] = await db
    .select()
    .from(tenantConfig)
    .where(eq(tenantConfig.subdomain, subdomain))
    .limit(1);
  return config || undefined;
}

async getTenantConfigById(id: string): Promise<TenantConfig | undefined> {
  const [config] = await db
    .select()
    .from(tenantConfig)
    .where(eq(tenantConfig.id, id))
    .limit(1);
  return config || undefined;
}
```

---

### Fix 3: Update Tenant Middleware Type
**File**: `server/tenant-middleware.ts`

Current extends wrong type. Should be:
```typescript
declare global {
  namespace Express {
    interface Request {
      tenant: {
        id: string;
        subdomain: string;
        companyName: string;
        primaryColor?: string | null;
        logoUrl?: string | null;
        modulesEnabled: any;
        apiKeysConfigured: any;
        // ... other TenantConfig fields
      };
    }
  }
}
```

---

### Fix 4: Make Onboarding Route Public
**File**: `server/index.ts`

Move tenant config creation BEFORE middleware:
```typescript
// line 44 (after tenant-requests, before resolveTenant middleware)

// PUBLIC route for initial tenant setup (onboarding)
app.post("/api/public/tenant-config", async (req, res) => {
  try {
    const { companyName, subdomain, primaryColor, industry, modulesEnabled } = req.body;
    
    // Check if subdomain already exists
    const existing = await storage.getTenantConfigBySubdomain(subdomain);
    if (existing) {
      return res.status(409).json({ message: "Subdomain already taken" });
    }
    
    // Validate subdomain format (alphanumeric, lowercase, no spaces)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json({ 
        message: "Subdomain must be lowercase alphanumeric (hyphens allowed)" 
      });
    }
    
    const config = await storage.createTenantConfig({
      companyName,
      subdomain,
      primaryColor: primaryColor || "#0ea5e9",
      industry,
      modulesEnabled: modulesEnabled || {},
      apiKeysConfigured: {},
    });
    
    res.status(201).json(config);
  } catch (error) {
    console.error("Error creating tenant config:", error);
    res.status(500).json({ message: "Failed to create tenant" });
  }
});
```

---

### Fix 5: Update Onboarding Component
**File**: `client/src/pages/customer-onboarding.tsx`

Change line 52:
```typescript
const saveTenantMutation = useMutation({
  mutationFn: async (data: any) => {
    // Use public endpoint for initial setup
    const response = await api.post("/public/tenant-config", data);
    return response.data;
  },
  onSuccess: (data) => {
    toast.success("Workspace configured successfully!");
    
    // Redirect to subdomain
    const newUrl = `${window.location.protocol}//${data.subdomain}.${window.location.host}`;
    window.location.href = newUrl;
  },
  onError: (error: any) => {
    const message = error.response?.data?.message || "Failed to save configuration";
    toast.error(message);
  },
});
```

---

### Fix 6: Update Routes to Use req.tenant.id
**File**: `server/routes.ts`

Update line 2323:
```typescript
app.get("/api/tenant-config", async (req, res) => {
  try {
    const config = await storage.getTenantConfig(req.tenant.id);
    res.json(config);
  } catch (error) {
    console.error("Error fetching tenant config:", error);
    res.status(500).json({ message: "Failed to fetch tenant config" });
  }
});
```

Update line 2348:
```typescript
app.post("/api/tenant-config", async (req, res) => {
  try {
    // This endpoint updates EXISTING tenant config
    const config = await storage.getTenantConfig(req.tenant.id);
    
    if (!config) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    // Validate modules
    if (req.body.modulesEnabled && typeof req.body.modulesEnabled !== 'object') {
      return res.status(400).json({ message: "modulesEnabled must be an object" });
    }
    
    const updated = await storage.updateTenantConfig(config.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating tenant config:", error);
    res.status(500).json({ message: "Failed to update tenant config" });
  }
});
```

---

## 🔍 Testing Steps

### 1. Test New Tenant Onboarding
```bash
# Create new tenant
curl -X POST http://localhost:5000/api/public/tenant-config \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "subdomain": "acme",
    "primaryColor": "#ff0000",
    "industry": "Technology",
    "modulesEnabled": {
      "recruitment": true,
      "integrity": true,
      "onboarding": false,
      "hr_management": true
    }
  }'
```

### 2. Test Tenant Resolution
```bash
# Should return Acme Corp config
curl http://localhost:5000/api/tenant/current \
  -H "Host: acme.localhost"

# Should return different tenant
curl http://localhost:5000/api/tenant/current \
  -H "Host: company.localhost"
```

### 3. Test Module Isolation
```bash
# Create candidate for acme tenant
curl -X POST http://localhost:5000/api/candidates \
  -H "Host: acme.localhost" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com"}'

# List candidates (should only show acme's candidates)
curl http://localhost:5000/api/candidates \
  -H "Host: acme.localhost"

# List candidates (should only show company's candidates)
curl http://localhost:5000/api/candidates \
  -H "Host: company.localhost"
```

---

## 📋 Summary of Changes

| File | Changes | Lines |
|------|---------|-------|
| `server/routes.ts` | Add `/api/tenant/current` endpoint | +15 |
| `server/index.ts` | Add `/api/public/tenant-config` endpoint | +35 |
| `server/storage.ts` | Make tenant methods tenant-aware | ~50 |
| `server/tenant-middleware.ts` | Fix type declaration | ~5 |
| `client/src/pages/customer-onboarding.tsx` | Use public endpoint | ~10 |

**Total Lines Changed**: ~115

---

## ⚠️ Breaking Changes

1. **Storage API**: All `getTenantConfig()` calls need `tenantId` parameter
2. **Onboarding Flow**: New tenants must use `/api/public/tenant-config`
3. **Existing Tenants**: Need to ensure each tenant has unique subdomain

---

## 🎯 Expected Behavior After Fixes

1. ✅ New company visits `/customer-onboarding`
2. ✅ Fills form with company details and subdomain
3. ✅ Clicks "Launch Workspace"
4. ✅ POST to `/api/public/tenant-config` creates tenant
5. ✅ Redirects to `https://[subdomain].domain.com`
6. ✅ Frontend loads tenant config from `/api/tenant/current`
7. ✅ Branding applied (colors, logo, company name)
8. ✅ Only enabled modules shown in dashboard
9. ✅ All data (candidates, jobs, etc.) isolated by tenant
10. ✅ Subdomain routing works correctly

---

## 🔧 Quick Fix Script

```bash
# Run this to apply all fixes at once
cat > /tmp/fix-tenant.sh << 'EOF'
#!/bin/bash
echo "Applying tenant system fixes..."
# Add fixes here after code review
EOF
chmod +x /tmp/fix-tenant.sh
```

---

**Root Cause**: Multi-tenant architecture was partially implemented but tenant resolution and data isolation weren't properly connected to storage layer.

**Fix Priority**: HIGH - This affects core multi-tenancy functionality
