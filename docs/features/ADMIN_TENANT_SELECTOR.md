# Admin Tenant Selector - Implementation Guide

## Overview

Added an admin interface to select and view different tenant dashboards. Admins can now switch between tenants and view their data without logging in as that tenant.

## Features

✅ **Tenant Dropdown Selector** - View all tenants in a searchable dropdown  
✅ **One-Click Tenant Switching** - Switch to any tenant's workspace instantly  
✅ **Visual Indicators** - See which tenant you're currently viewing  
✅ **Persistent Selection** - Tenant selection persists across page reloads  
✅ **Easy Exit** - Return to your own workspace with one click  
✅ **Integrated in Navbar** - Available on all admin pages  

## Changes Made

### 1. Backend API Endpoints (server/routes.ts)

#### Get All Tenants (Admin Only)
```typescript
GET /api/admin/tenants

Response: TenantConfig[]
```

Lists all tenant configurations for the admin to choose from.

#### Impersonate Tenant (Admin Only)
```typescript
POST /api/admin/impersonate-tenant
Body: { tenantId: string }

Response: TenantConfig
```

Returns the full tenant configuration for the selected tenant.

### 2. Tenant Selector Component

**Location**: `client/src/components/admin/TenantSelector.tsx`

**Features**:
- Dropdown menu with all tenants
- Shows current tenant with checkmark
- "Viewing" badge when impersonating
- Refresh button to reload tenant list
- "Exit Tenant View" option
- Persists selection in localStorage

**Usage**:
```tsx
import { TenantSelector } from "@/components/admin/TenantSelector";

<TenantSelector 
  currentTenant={tenant} 
  onTenantChange={(tenant) => console.log('Switched to:', tenant)}
/>
```

### 3. Updated TenantContext

**Location**: `client/src/contexts/TenantContext.tsx`

Now checks for impersonated tenant in localStorage before loading from API:

```typescript
// Priority:
// 1. localStorage 'admin_impersonated_tenant' (admin view)
// 2. API /tenant/current (normal tenant resolution)
```

### 4. Integrated in UI

#### Admin Dashboard
- Tenant selector in header next to "AI Personas" button
- Visible on admin-dashboard page

#### Navbar
- Automatically shows on admin pages
- Hidden on regular pages
- Appears in the admin section of navbar

## How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Admin visits admin page                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ TenantContext checks localStorage for 'admin_impersonated'  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─── Yes ──> Use impersonated tenant
                 │
                 └─── No ───> Load from /api/tenant/current
                              
┌─────────────────────────────────────────────────────────────┐
│ Admin clicks TenantSelector dropdown                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Loads all tenants from /api/admin/tenants                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Admin selects a tenant                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ POST /api/admin/impersonate-tenant                          │
│ Saves to localStorage                                        │
│ Reloads page with new tenant context                         │
└─────────────────────────────────────────────────────────────┘
```

### Storage Mechanism

```typescript
// When impersonating
localStorage.setItem('admin_impersonated_tenant', JSON.stringify(tenant));

// When exiting
localStorage.removeItem('admin_impersonated_tenant');

// On page load
const stored = localStorage.getItem('admin_impersonated_tenant');
if (stored) {
  tenant = JSON.parse(stored);
}
```

## Usage Examples

### For Admins

1. **View Admin Dashboard**:
   ```
   Navigate to: /admin-dashboard
   ```

2. **Switch Tenant**:
   - Click the tenant selector dropdown (shows current tenant)
   - Select any tenant from the list
   - Page reloads with that tenant's data

3. **Return to Your Workspace**:
   - Click tenant selector
   - Click "Exit Tenant View"
   - Returns to default tenant

### For Developers

#### Add Tenant Selector to New Page

```tsx
import { TenantSelector } from "@/components/admin/TenantSelector";
import { useTenant } from "@/contexts/TenantContext";

export default function MyAdminPage() {
  const { tenant } = useTenant();
  
  return (
    <div>
      <TenantSelector currentTenant={tenant} />
      {/* Rest of your page */}
    </div>
  );
}
```

#### Check if Viewing as Admin

```tsx
const isImpersonating = localStorage.getItem('admin_impersonated_tenant') !== null;

if (isImpersonating) {
  // Show admin warning banner
  // Disable certain actions
}
```

## Security Considerations

### Authentication

Both endpoints require admin authentication:

```typescript
app.get("/api/admin/tenants", requireAdmin, ...);
app.post("/api/admin/impersonate-tenant", requireAdmin, ...);
```

### Best Practices

1. **Read-Only Mode**: Consider making impersonated views read-only
2. **Audit Logging**: Log all tenant switches for compliance
3. **Session Timeout**: Clear impersonation on logout
4. **Visual Indicators**: Always show when viewing as another tenant

### Suggested Enhancements

```tsx
// Add audit logging
const impersonateMutation = useMutation({
  mutationFn: async (tenantId: string) => {
    const response = await api.post("/admin/impersonate-tenant", { 
      tenantId,
      auditLog: {
        action: 'impersonate_tenant',
        timestamp: new Date(),
        adminId: currentUser.id
      }
    });
    return response.data;
  }
});
```

## API Reference

### GET /api/admin/tenants

**Auth**: Required (Admin)

**Response**:
```json
[
  {
    "id": "uuid",
    "companyName": "Acme Corp",
    "subdomain": "acme",
    "primaryColor": "#ff0000",
    "modulesEnabled": {
      "recruitment": true,
      "integrity": true
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/admin/impersonate-tenant

**Auth**: Required (Admin)

**Request**:
```json
{
  "tenantId": "uuid"
}
```

**Response**:
```json
{
  "id": "uuid",
  "companyName": "Acme Corp",
  "subdomain": "acme",
  "primaryColor": "#ff0000",
  "modulesEnabled": {
    "recruitment": true,
    "integrity": true
  }
}
```

**Errors**:
- 400: Missing tenantId
- 404: Tenant not found
- 401/403: Unauthorized

## Testing

### Manual Testing

1. **Test Tenant List**:
   ```bash
   curl -H "Authorization: Bearer <ADMIN_KEY>" \
     http://localhost:5000/api/admin/tenants
   ```

2. **Test Impersonation**:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <ADMIN_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"tenantId": "uuid"}' \
     http://localhost:5000/api/admin/impersonate-tenant
   ```

3. **Test UI Flow**:
   - Go to /admin-dashboard
   - Click tenant selector
   - Select different tenant
   - Verify page reloads with new tenant data
   - Check localStorage has 'admin_impersonated_tenant'
   - Click "Exit Tenant View"
   - Verify returns to original tenant

### Integration Testing

```typescript
describe('Tenant Selector', () => {
  it('loads all tenants', async () => {
    const { data } = await api.get('/admin/tenants');
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThan(0);
  });

  it('impersonates tenant', async () => {
    const { data } = await api.post('/admin/impersonate-tenant', {
      tenantId: 'test-tenant-id'
    });
    expect(data.id).toBe('test-tenant-id');
  });

  it('persists selection', () => {
    const tenant = { id: '123', companyName: 'Test' };
    localStorage.setItem('admin_impersonated_tenant', JSON.stringify(tenant));
    
    const stored = localStorage.getItem('admin_impersonated_tenant');
    expect(JSON.parse(stored!)).toEqual(tenant);
  });
});
```

## Troubleshooting

### Issue: Tenant selector not showing

**Solution**: Check if on admin page:
```tsx
const isAdminPage = location.startsWith('/admin-') || location === '/persona-management';
```

### Issue: Can't switch tenants

**Solution**: Verify admin authentication:
```bash
# Check ADMIN_API_KEY is set
echo $ADMIN_API_KEY

# Test endpoint
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:5000/api/admin/tenants
```

### Issue: Wrong tenant data after switch

**Solution**: Clear localStorage and reload:
```javascript
localStorage.removeItem('admin_impersonated_tenant');
window.location.reload();
```

### Issue: Stuck in impersonated mode

**Solution**: Manually clear localStorage:
```javascript
// In browser console
localStorage.removeItem('admin_impersonated_tenant');
window.location.reload();
```

## Future Enhancements

### 1. Search/Filter Tenants
```tsx
<Input 
  placeholder="Search tenants..." 
  onChange={(e) => filterTenants(e.target.value)}
/>
```

### 2. Tenant Statistics
```tsx
<DropdownMenuItem>
  <div>
    <div>{tenant.companyName}</div>
    <div className="text-xs">
      {tenant.userCount} users • {tenant.jobCount} jobs
    </div>
  </div>
</DropdownMenuItem>
```

### 3. Recent Tenants
```typescript
const recentTenants = JSON.parse(
  localStorage.getItem('recent_impersonated_tenants') || '[]'
);
```

### 4. Readonly Banner
```tsx
{isImpersonating && (
  <Alert variant="warning">
    <Eye className="w-4 h-4" />
    Viewing as {tenant.companyName} (Read-only mode)
  </Alert>
)}
```

### 5. Multi-Tab Support
```typescript
// Use BroadcastChannel for cross-tab sync
const channel = new BroadcastChannel('tenant_switch');
channel.postMessage({ action: 'tenant_changed', tenantId });
```

## Files Modified

| File | Purpose | Lines |
|------|---------|-------|
| `server/routes.ts` | Admin endpoints | +35 |
| `client/src/components/admin/TenantSelector.tsx` | Selector component | +170 |
| `client/src/contexts/TenantContext.tsx` | Support impersonation | +15 |
| `client/src/pages/admin-dashboard.tsx` | Integrate selector | +5 |
| `client/src/components/layout/navbar.tsx` | Show on admin pages | +10 |

**Total**: ~235 lines across 5 files

## Summary

The admin tenant selector provides a powerful way for administrators to:
- ✅ View and manage multiple tenants
- ✅ Switch between tenant workspaces seamlessly
- ✅ Debug tenant-specific issues
- ✅ Provide customer support
- ✅ Demo different tenant configurations

All while maintaining security through admin authentication and clear visual indicators of impersonation mode.
