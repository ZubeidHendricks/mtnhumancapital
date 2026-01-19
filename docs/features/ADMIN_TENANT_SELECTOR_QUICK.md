# 🎯 Admin Tenant Selector - Quick Guide

## What Was Added

An admin interface that allows switching between different tenant workspaces to view their dashboards and data.

## Key Features

✅ **Dropdown Selector** - Shows all tenants in a clean dropdown  
✅ **One-Click Switch** - Instantly view any tenant's workspace  
✅ **Visual Badge** - Clear "Viewing" indicator when impersonating  
✅ **Persistent** - Selection stays across page reloads  
✅ **Easy Exit** - Return to your workspace anytime  

## Where to Find It

### In Admin Dashboard
Navigate to: `/admin-dashboard`
- Tenant selector appears in the header (next to "AI Personas" button)

### In Other Admin Pages
- Automatically shows in navbar on any admin page
- Appears after the Admin dropdown menu

## How to Use

### Switch to Another Tenant

1. Click the tenant selector dropdown
2. Select any tenant from the list
3. Page reloads with that tenant's data
4. "Viewing" badge appears

### Return to Your Workspace

1. Click the tenant selector dropdown
2. Click "Exit Tenant View"
3. Returns to your default tenant

## What You Can Do

When viewing another tenant's workspace:

- ✅ View their dashboards
- ✅ See their candidates and jobs
- ✅ Check their module configuration
- ✅ Review their data and settings
- ✅ Test features as that tenant

## Files Added/Modified

### New Files
- `client/src/components/admin/TenantSelector.tsx` - The selector component

### Modified Files
- `server/routes.ts` - Added admin API endpoints
- `client/src/contexts/TenantContext.tsx` - Support for impersonation
- `client/src/pages/admin-dashboard.tsx` - Integrated selector
- `client/src/components/layout/navbar.tsx` - Shows on admin pages

## API Endpoints

### Get All Tenants
```
GET /api/admin/tenants
Auth: Required (Admin)
```

### Switch Tenant
```
POST /api/admin/impersonate-tenant
Body: { "tenantId": "uuid" }
Auth: Required (Admin)
```

## Technical Details

### How It Works

1. Admin clicks tenant selector
2. Loads all tenants from `/api/admin/tenants`
3. Admin selects a tenant
4. Calls `/api/admin/impersonate-tenant`
5. Saves tenant to localStorage
6. Reloads page with new tenant context

### Storage

```typescript
// Stored in localStorage
key: 'admin_impersonated_tenant'
value: TenantConfig object
```

### Security

- ✅ Requires admin authentication
- ✅ Both endpoints protected by `requireAdmin` middleware
- ✅ Clear visual indicator when impersonating
- ✅ Easy to exit impersonation mode

## Quick Start

1. **Start the server**: `npm run dev`
2. **Go to admin page**: `http://localhost:5000/admin-dashboard`
3. **Click tenant selector** (building icon dropdown)
4. **Select any tenant**
5. **View their workspace!**

## Troubleshooting

### Can't see tenant selector?
- Make sure you're on an admin page (`/admin-dashboard`, `/persona-management`, etc.)
- Check that admin authentication is configured

### Can't switch tenants?
- Verify `ADMIN_API_KEY` is set
- Check browser console for errors
- Try clearing localStorage: `localStorage.removeItem('admin_impersonated_tenant')`

### Stuck viewing another tenant?
- Click tenant selector → "Exit Tenant View"
- Or manually clear: `localStorage.removeItem('admin_impersonated_tenant')` and reload

## Visual Preview

```
┌─────────────────────────────────────────┐
│  Admin Dashboard                        │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │ 🏢 Acme Corp ▼ │  │ ✨ Personas  │ │
│  └─────────────────┘  └──────────────┘ │
│         │                               │
│         ▼                               │
│  ┌─────────────────────────────┐       │
│  │ Switch Tenant          🔄   │       │
│  ├─────────────────────────────┤       │
│  │ ✓ Acme Corp               │       │
│  │   acme.domain.com          │       │
│  │                             │       │
│  │   TechCo Inc               │       │
│  │   techco.domain.com        │       │
│  │                             │       │
│  │   StartUp Ltd              │       │
│  │   startup.domain.com       │       │
│  ├─────────────────────────────┤       │
│  │ 👁️ Exit Tenant View        │       │
│  └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

## Next Steps

1. **Test it**: Try switching between tenants
2. **Customize**: Add more tenant info to dropdown
3. **Enhance**: Add search/filter functionality
4. **Monitor**: Add audit logging for compliance

## Documentation

- **Full details**: `ADMIN_TENANT_SELECTOR.md`
- **Implementation**: All changes documented inline

---

**Status**: ✅ Complete and ready to use  
**Date**: 2025-12-07
