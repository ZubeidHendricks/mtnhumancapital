# Visual Guide - Multi-Tenant System with Admin Selector

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AVATAR HUMAN CAPITAL                     │
│                        Multi-Tenant Platform                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Tenant: Acme   │     │  Tenant: TechCo │     │ Tenant: StartUp │
│  acme.ahc.com   │     │ techco.ahc.com  │     │ startup.ahc.com │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Tenant Middleware     │
                    │  - Resolves subdomain   │
                    │  - Sets req.tenant      │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌────────────────┐      ┌────────────────┐     ┌────────────────┐
│ Acme's Data    │      │ TechCo's Data  │     │ StartUp's Data │
│ - Candidates   │      │ - Candidates   │     │ - Candidates   │
│ - Jobs         │      │ - Jobs         │     │ - Jobs         │
│ - Config       │      │ - Config       │     │ - Config       │
└────────────────┘      └────────────────┘     └────────────────┘
```

## Tenant Onboarding Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: Company Visits Onboarding Page                          │
│                                                                  │
│  Browser → https://avatarhuman.capital/customer-onboarding      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: Fill Out Company Details                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Company Name:    [Acme Corp                          ] │    │
│  │ Subdomain:       [acme                               ] │    │
│  │ Primary Color:   [🎨 #ff0000                         ] │    │
│  │ Industry:        [Technology ▼                       ] │    │
│  │                                                        │    │
│  │ Modules:                                               │    │
│  │ ☑ Recruitment   ☑ Integrity                          │    │
│  │ ☑ Onboarding    ☑ HR Management                      │    │
│  │                                                        │    │
│  │              [Launch Workspace]                       │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: POST to Public Endpoint                                 │
│                                                                  │
│  Frontend → POST /api/public/tenant-config                      │
│             {                                                    │
│               "companyName": "Acme Corp",                        │
│               "subdomain": "acme",                               │
│               "primaryColor": "#ff0000",                         │
│               ...                                                │
│             }                                                    │
│                                                                  │
│  Backend:                                                        │
│   ✓ Validates subdomain format                                  │
│   ✓ Checks subdomain uniqueness                                 │
│   ✓ Creates tenant record in DB                                 │
│   ✓ Returns created tenant config                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 4: Redirect to Tenant Subdomain                            │
│                                                                  │
│  Development:  http://localhost:5000?tenant=acme                │
│  Production:   https://acme.avatarhuman.capital                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 5: Tenant Workspace Loads                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 🏢 Acme Corp                        [User Menu ▼]    │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │                                                        │    │
│  │  Welcome to Your Workspace! 🎉                        │    │
│  │                                                        │    │
│  │  Your branded workspace is ready.                      │    │
│  │  Color: 🔴 Red (#ff0000)                              │    │
│  │                                                        │    │
│  │  Available Modules:                                    │    │
│  │  • Recruitment & Selection                             │    │
│  │  • Integrity Evaluation                                │    │
│  │  • Company Onboarding                                  │    │
│  │  • HR Management                                       │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Admin Tenant Selector Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: Admin Opens Admin Dashboard                             │
│                                                                  │
│  Browser → http://localhost:5000/admin-dashboard                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: Admin Dashboard with Tenant Selector                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 🏢 System Administration                               │    │
│  │                                                        │    │
│  │  ┌───────────────────┐  ┌──────────────┐             │    │
│  │  │ 🏢 Acme Corp ▼   │  │ ✨ Personas  │             │    │
│  │  └───────────────────┘  └──────────────┘             │    │
│  │                                                        │    │
│  │  Feature Toggles | Email Config | Modules | Secrets   │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: Admin Clicks Tenant Selector                            │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Switch Tenant          🔄   │                                │
│  ├─────────────────────────────┤                                │
│  │ ✓ Acme Corp               │ ← Currently viewing            │
│  │   acme.domain.com          │                                │
│  │                             │                                │
│  │   TechCo Inc               │                                │
│  │   techco.domain.com        │ ← Click to switch              │
│  │                             │                                │
│  │   StartUp Ltd              │                                │
│  │   startup.domain.com       │                                │
│  ├─────────────────────────────┤                                │
│  │ 👁️ Exit Tenant View        │                                │
│  └─────────────────────────────┘                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 4: POST to Impersonate Endpoint                            │
│                                                                  │
│  Frontend → POST /api/admin/impersonate-tenant                  │
│             { "tenantId": "techco-uuid" }                        │
│                                                                  │
│  Backend:                                                        │
│   ✓ Validates admin authentication                              │
│   ✓ Fetches tenant config from DB                               │
│   ✓ Returns tenant config                                       │
│                                                                  │
│  Frontend:                                                       │
│   ✓ Saves to localStorage                                       │
│   ✓ Reloads page                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 5: Page Reloads with TechCo's Data                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 🏢 System Administration                               │    │
│  │                                                        │    │
│  │  [👁️ Viewing] ┌──────────────────┐  ┌──────────────┐ │    │
│  │               │ 🏢 TechCo Inc ▼ │  │ ✨ Personas  │ │    │
│  │               └──────────────────┘  └──────────────┘ │    │
│  │                                                        │    │
│  │  Now viewing TechCo Inc's workspace                   │    │
│  │  • TechCo's candidates and jobs                        │    │
│  │  • TechCo's modules and settings                       │    │
│  │  • TechCo's branding colors                            │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Data Isolation Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        API Request                              │
│                                                                 │
│  GET /api/candidates                                            │
│  Host: acme.avatarhuman.capital                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │    Tenant Resolution Middleware       │
        │                                       │
        │  1. Extract subdomain: "acme"         │
        │  2. Query DB for tenant               │
        │  3. Set req.tenant = {                │
        │       id: "uuid-acme",                │
        │       subdomain: "acme",              │
        │       companyName: "Acme Corp"        │
        │     }                                 │
        └──────────────────┬────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │         Route Handler                 │
        │                                       │
        │  app.get("/api/candidates", ...)      │
        │                                       │
        │  const candidates = await storage     │
        │    .getAllCandidates(req.tenant.id)   │
        │              ↓                        │
        │    WHERE tenantId = req.tenant.id     │
        └──────────────────┬────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │           Database Query              │
        │                                       │
        │  SELECT * FROM candidates             │
        │  WHERE tenantId = 'uuid-acme'         │
        │                                       │
        │  Returns ONLY Acme's candidates       │
        │  ✓ Data isolation enforced            │
        └───────────────────────────────────────┘
```

## Storage in Browser

```
localStorage Structure:
┌─────────────────────────────────────────────────────────┐
│ Key: 'admin_impersonated_tenant'                       │
│                                                         │
│ Value: {                                                │
│   "id": "uuid-techco",                                  │
│   "companyName": "TechCo Inc",                          │
│   "subdomain": "techco",                                │
│   "primaryColor": "#0000ff",                            │
│   "modulesEnabled": {                                   │
│     "recruitment": true,                                │
│     "integrity": false,                                 │
│     "onboarding": true,                                 │
│     "hr_management": true                               │
│   }                                                     │
│ }                                                       │
└─────────────────────────────────────────────────────────┘

When present: TenantContext uses this instead of API
When absent: TenantContext loads from /api/tenant/current
```

## Component Tree

```
App
├── TenantProvider (reads localStorage or API)
│   ├── Router
│   │   ├── AdminDashboard
│   │   │   └── TenantSelector
│   │   │       ├── Dropdown with tenant list
│   │   │       └── "Exit Tenant View" button
│   │   │
│   │   ├── Navbar
│   │   │   └── TenantSelector (on admin pages)
│   │   │
│   │   └── Other Pages
│   │       └── Use useTenant() hook for current tenant
│   │
│   └── TenantContext.Provider
│       └── Provides { tenant, loading, error }
```

## API Endpoints Map

```
PUBLIC (no tenant required):
  POST /api/public/tenant-config      → Create new tenant
  GET  /api/public/interview-session  → Public interview access
  POST /api/tenant-requests            → Request new tenant

TENANT-SCOPED (requires tenant middleware):
  GET  /api/tenant/current             → Get current tenant config
  GET  /api/tenant-config              → Get current tenant config
  POST /api/tenant-config              → Update current tenant
  GET  /api/candidates                 → Get tenant's candidates
  GET  /api/jobs                       → Get tenant's jobs
  ... all other data endpoints         → Filtered by tenantId

ADMIN-ONLY (requires admin auth):
  GET  /api/admin/tenants              → List all tenants
  POST /api/admin/impersonate-tenant   → Switch to tenant view
  GET  /api/tenant-requests            → View tenant requests
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Request to Admin Endpoint                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   requireAdmin Middleware     │
        │                               │
        │  1. Check Authorization       │
        │     header                    │
        │  2. Extract Bearer token      │
        │  3. Compare with              │
        │     ADMIN_API_KEY             │
        │  4. Allow or reject           │
        └──────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ✅ Authorized      ❌ Unauthorized
         │                   │
         │                   └──> 401/403 Error
         │
         ▼
    Execute route
    handler
```

---

**Legend**:
- ✅ = Success/Complete
- ❌ = Error/Blocked
- 🏢 = Tenant/Company
- 👁️ = Viewing/Impersonating
- 🔄 = Refresh/Reload
- ✨ = Feature/Special
