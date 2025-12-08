# DNS Setup Guide for Multi-Tenant Subdomains

## Overview

Avatar Human Capital uses subdomain-based routing to provide each customer with their own branded URL (e.g., `acme.capital`, `techcorp.capital`). This guide explains how to configure DNS for each new tenant.

## Prerequisites

- Access to your domain registrar's DNS management panel (where `.capital` is registered)
- Your Replit app's IP address (found in the Replit deployment settings)
- The tenant's chosen subdomain name (e.g., `acme`, `techcorp`)

## Step-by-Step DNS Configuration

### 1. Get Your Replit App IP Address

1. Go to your Replit project
2. Navigate to the **Deployments** tab
3. Click on your active deployment
4. Find and copy the **IP address** (it will look like `123.45.67.89`)

### 2. Access Your DNS Provider

Log in to your domain registrar where `.capital` is registered. Common providers include:
- Namecheap
- GoDaddy
- Google Domains
- Cloudflare
- Other DNS providers

### 3. Add A Record for New Tenant

In your DNS management panel:

1. Click **Add Record** or **Add DNS Record**
2. Select record type: **A**
3. Fill in the fields:
   - **Host/Name**: Enter the subdomain (e.g., `acme` for `acme.capital`)
   - **Value/Points to**: Enter your Replit app IP address
   - **TTL**: Use default (typically 3600 seconds / 1 hour) or set to 300 for faster propagation

4. Click **Save** or **Add Record**

### Example Configuration

```
Type: A
Host: acme
Value: 123.45.67.89
TTL: 3600
```

This creates: `acme.capital` → `123.45.67.89`

### 4. Wait for DNS Propagation

- **Typical propagation time**: 5-30 minutes
- **Maximum propagation time**: Up to 48 hours (rare)
- **Faster propagation**: Set TTL to 300 seconds (5 minutes) before making changes

### 5. Verify DNS Configuration

Check if DNS is properly configured:

```bash
# Using nslookup
nslookup acme.capital

# Using dig
dig acme.capital

# Using online tools
# Visit: https://dnschecker.org/#A/acme.capital
```

Expected output should show your Replit app's IP address.

### 6. Create Tenant in Database

Once DNS is configured, add the tenant to your database:

```sql
INSERT INTO tenant_config (
  company_name,
  subdomain,
  primary_color,
  tagline,
  industry,
  modules_enabled,
  api_keys_configured
) VALUES (
  'Acme Corporation',
  'acme',
  '#0ea5e9',
  'Building Tomorrow, Today',
  'Technology',
  '{"recruitment": true, "integrity": true, "onboarding": true, "hr_management": true}',
  '{}'
);
```

Or use the admin interface (when available) to create the tenant.

### 7. Test the Subdomain

1. Open a browser and navigate to `https://acme.capital`
2. Verify the tenant-specific branding loads
3. Check that the tenant name appears in the navbar
4. Confirm data isolation (only tenant-specific data is visible)

## DNS Record Templates

### Standard Tenant

```
Type: A
Host: [subdomain]
Value: [your-replit-ip]
TTL: 3600
```

### Root Domain (Optional)

If you want `capital` (without subdomain) to work:

```
Type: A
Host: @
Value: [your-replit-ip]
TTL: 3600
```

### Wildcard (Not Supported by Replit)

⚠️ **Note**: Replit does not support wildcard DNS routing (`*.capital`). Each subdomain must be manually configured.

## Troubleshooting

### DNS Not Resolving

**Problem**: `acme.capital` doesn't load or shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Solutions**:
1. Check DNS propagation status at https://dnschecker.org
2. Verify A record is correctly configured in DNS panel
3. Wait longer (DNS can take up to 48 hours)
4. Clear your local DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Wrong Tenant Loading

**Problem**: Subdomain loads, but shows incorrect tenant data

**Solutions**:
1. Verify tenant exists in `tenant_config` table with correct subdomain
2. Check subdomain matches exactly (case-sensitive)
3. Restart the application to refresh tenant cache
4. Clear browser cache and cookies

### SSL/HTTPS Errors

**Problem**: "Your connection is not private" or SSL warnings

**Solutions**:
1. Wait for Replit to automatically provision SSL certificate (can take 5-10 minutes after DNS propagation)
2. Verify DNS is fully propagated before expecting SSL
3. Try accessing via HTTP first, then HTTPS
4. Contact Replit support if SSL doesn't provision after 24 hours

## Scaling Considerations

### Manual DNS Management

- **Works well for**: 5-50 customers
- **Time per tenant**: 5-10 minutes (DNS setup + database entry)
- **Recommended if**: You have a known set of customers or limited growth rate

### When to Consider Alternatives

If you need to onboard:
- More than 100 tenants
- Instant/self-service tenant provisioning
- Rapid customer acquisition

Consider switching to **path-based routing** (`hr.capital/acme`) instead, which doesn't require DNS changes.

## Automation Ideas (Future Enhancement)

For teams managing many tenants, consider:

1. **DNS API Integration**:
   - Use your DNS provider's API to automate A record creation
   - Examples: Cloudflare API, Route53 API, Namecheap API

2. **Admin Dashboard**:
   - Build an admin UI to create tenants
   - Automatically add DNS records via API
   - Send welcome email with subdomain URL

3. **Terraform/Infrastructure as Code**:
   - Define DNS records in Terraform
   - Version control your DNS configuration
   - Automate deployment of new tenants

## Checklist for New Tenant Setup

- [ ] Customer provides desired subdomain name
- [ ] Verify subdomain is available (not already taken)
- [ ] Add A record in DNS management panel
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Verify DNS resolution with `dig` or `nslookup`
- [ ] Create tenant record in database
- [ ] Test subdomain in browser
- [ ] Verify SSL certificate is provisioned
- [ ] Verify tenant-specific branding displays
- [ ] Confirm data isolation (no cross-tenant data visible)
- [ ] Notify customer that subdomain is ready
- [ ] Document tenant details (subdomain, company name, contact)

## Support Resources

- **Replit Custom Domains**: https://docs.replit.com/hosting/deployments/custom-domains
- **DNS Checker**: https://dnschecker.org
- **DNS Propagation Check**: https://www.whatsmydns.net

## Contact

For technical support or questions about DNS setup:
- Internal team: [Your support channel]
- Replit support: support@replit.com
