# Production Deployment: Tenant Module Control

## ISSUE FOUND ✓
**The valid modules list was hardcoded to only 4 modules**, preventing updates to other modules like FleetLogix, LMS, etc.

**FIXED:** Updated `server/routes.ts` to include all valid modules.

---

## How to Deploy & Test on DigitalOcean

### Step 1: Deploy the Fix

```bash
# SSH into your DigitalOcean droplet
ssh root@your-droplet-ip

# Navigate to your app directory
cd /path/to/AvatarHumanCapital

# Pull latest changes
git pull origin main

# Restart the application
pm2 restart all
# OR
systemctl restart avatarhc
# OR whatever process manager you use
```

### Step 2: Enable Modules via Database (DigitalOcean)

Connect to your production database and run:

```sql
-- Check current tenant configuration
SELECT 
  id,
  subdomain, 
  company_name, 
  modules_enabled 
FROM tenant_config;

-- Enable ALL modules for the default tenant
UPDATE tenant_config 
SET 
  modules_enabled = '{
    "recruitment": true,
    "integrity": true,
    "onboarding": true,
    "hr_management": true,
    "fleetlogix": true,
    "workforce_intelligence": true,
    "lms": true,
    "kpi_performance": true,
    "social_screening": true,
    "document_automation": true,
    "whatsapp": true,
    "pnet": true
  }'::jsonb,
  updated_at = NOW()
WHERE subdomain = 'company';

-- Verify the update
SELECT 
  subdomain,
  modules_enabled,
  updated_at
FROM tenant_config
WHERE subdomain = 'company';
```

### Step 3: Test via Production API

Replace `your-domain.com` with your actual DigitalOcean domain:

```bash
#!/bin/bash

PROD_URL="https://your-domain.com"

echo "Testing Production Tenant Module Control"
echo "=========================================="

# Test 1: Fetch tenant config
echo ""
echo "1. Fetching tenant config..."
curl -s "$PROD_URL/api/tenant-config" | jq '.'

# Test 2: Check specific modules
echo ""
echo "2. Checking module status..."
curl -s "$PROD_URL/api/tenant-config" | jq '.modulesEnabled'

# Test 3: Update modules (requires authentication)
echo ""
echo "3. To update modules, use the admin panel or:"
echo "   PATCH $PROD_URL/api/tenant-config/{tenant_id}"
echo "   with proper authentication headers"
```

### Step 4: Test Module Access in Browser

1. Go to `https://your-domain.com/login`
2. Login with admin credentials
3. Navigate to Settings or Admin Panel
4. Check that all modules are visible in navigation
5. Try accessing FleetLogix at `https://your-domain.com/fleetlogix`
6. Verify navigation shows all enabled modules

---

## Quick SQL Scripts for Common Tasks

### Enable FleetLogix Only
```sql
UPDATE tenant_config 
SET modules_enabled = jsonb_set(
  COALESCE(modules_enabled, '{}'::jsonb),
  '{fleetlogix}',
  'true'::jsonb
)
WHERE subdomain = 'company';
```

### Disable a Module
```sql
UPDATE tenant_config 
SET modules_enabled = jsonb_set(
  modules_enabled,
  '{lms}',
  'false'::jsonb
)
WHERE subdomain = 'company';
```

### Check Which Modules Are Enabled
```sql
SELECT 
  subdomain,
  jsonb_object_keys(modules_enabled) as module_name,
  modules_enabled->>jsonb_object_keys(modules_enabled) as enabled
FROM tenant_config
WHERE subdomain = 'company';
```

### Enable Multiple Specific Modules
```sql
UPDATE tenant_config 
SET modules_enabled = modules_enabled || '{
  "fleetlogix": true,
  "lms": true,
  "pnet": true
}'::jsonb
WHERE subdomain = 'company';
```

---

## Production Environment Variables

Make sure these are set on DigitalOcean:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
PORT=5000
NODE_ENV=production
SESSION_SECRET=your-secret-here
```

---

## API Testing Script for Production

Save as `test-production-modules.sh`:

```bash
#!/bin/bash

# Configuration
PROD_URL="${PROD_URL:-https://your-domain.com}"
USERNAME="${ADMIN_USER:-admin}"
PASSWORD="${ADMIN_PASS:-your-password}"

echo "Testing Tenant Module Control on Production"
echo "============================================"
echo "URL: $PROD_URL"
echo ""

# Login to get session/token
echo "1. Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  -c cookies.txt \
  "$PROD_URL/api/auth/login")

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Get tenant config
echo ""
echo "2. Fetching tenant config..."
TENANT_CONFIG=$(curl -s -b cookies.txt "$PROD_URL/api/tenant-config")
echo "$TENANT_CONFIG" | jq '.'

TENANT_ID=$(echo "$TENANT_CONFIG" | jq -r '.id')
MODULES=$(echo "$TENANT_CONFIG" | jq '.modulesEnabled')

echo ""
echo "Tenant ID: $TENANT_ID"
echo "Current Modules:"
echo "$MODULES" | jq '.'

# Test specific module access
echo ""
echo "3. Testing FleetLogix access..."
FLEETLOGIX_STATUS=$(curl -s -w "\nHTTP_CODE:%{http_code}" -b cookies.txt "$PROD_URL/api/fleetlogix/drivers")
HTTP_CODE=$(echo "$FLEETLOGIX_STATUS" | grep HTTP_CODE | cut -d: -f2)
echo "Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" == "200" ]; then
    echo "✓ FleetLogix is accessible"
elif [ "$HTTP_CODE" == "403" ]; then
    echo "✗ FleetLogix is forbidden (module disabled)"
elif [ "$HTTP_CODE" == "401" ]; then
    echo "⚠ Authentication required"
else
    echo "⚠ Unexpected status: $HTTP_CODE"
fi

# Clean up
rm -f cookies.txt

echo ""
echo "Testing complete!"
```

Make it executable:
```bash
chmod +x test-production-modules.sh
```

Run it:
```bash
PROD_URL=https://your-domain.com ADMIN_USER=admin ADMIN_PASS=yourpass ./test-production-modules.sh
```

---

## Verification Checklist

After deployment, verify:

- [ ] Code deployed to DigitalOcean
- [ ] Application restarted
- [ ] Database updated with enabled modules
- [ ] `/api/tenant-config` returns JSON (not HTML)
- [ ] `modulesEnabled` is an object with all modules
- [ ] Can update modules via API without validation errors
- [ ] Navigation shows all enabled modules
- [ ] FleetLogix page is accessible
- [ ] Module-specific APIs work when modules are enabled
- [ ] Module-specific APIs return 403 when modules are disabled

---

## Troubleshooting

### API returns HTML instead of JSON
- Check nginx/reverse proxy configuration
- Ensure `/api/*` routes are proxied to Node.js app
- Check that app is running on correct port

### Module updates fail with "Invalid module key"
- Verify the fix was deployed
- Check `validModules` array in `server/routes.ts`
- Restart the application

### Changes don't persist
- Check database connection
- Verify `updated_at` timestamp changes
- Check for transaction rollbacks in logs

### Module still not accessible after enabling
- Clear browser cache
- Check React Query cache (localStorage)
- Verify `useTenant()` hook is used correctly
- Check server logs for route errors

---

## Monitoring

Add these to your monitoring:

```bash
# Check if modules are enabled
curl -s https://your-domain.com/api/tenant-config | jq '.modulesEnabled'

# Check FleetLogix health
curl -s -w "\n%{http_code}" https://your-domain.com/api/fleetlogix/drivers

# Watch server logs
pm2 logs avatarhc --lines 100
```

---

## Next Steps

1. Deploy this fix to production
2. Run the SQL script to enable modules
3. Test with the provided scripts
4. Verify in browser
5. Monitor for any issues
6. Document which modules each tenant has access to

---

## Support

If issues persist after deployment:

1. Check application logs: `pm2 logs` or `journalctl -u avatarhc`
2. Check nginx logs: `tail -f /var/log/nginx/error.log`
3. Verify database connection: `psql $DATABASE_URL -c "SELECT 1;"`
4. Check environment variables: `pm2 env 0` or `systemctl status avatarhc`
