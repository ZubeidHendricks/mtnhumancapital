# Multi-Tenant Quick Start Guide

## Adding a New Customer Tenant

### Quick Steps (5-10 minutes per tenant)

1. **Get subdomain name from customer** (e.g., "acme")

2. **Add DNS A Record** in your `.capital` domain registrar:
   ```
   Type: A
   Host: acme
   Value: [your-replit-ip]
   TTL: 3600
   ```

3. **Wait 5-30 minutes** for DNS to propagate

4. **Create tenant in database**:
   ```sql
   INSERT INTO tenant_config (company_name, subdomain, primary_color, tagline, industry, modules_enabled, api_keys_configured)
   VALUES ('Acme Corp', 'acme', '#0ea5e9', 'Your tagline', 'Technology', 
           '{"recruitment": true, "integrity": true, "onboarding": true, "hr_management": true}', '{}');
   ```

5. **Test**: Visit `https://acme.capital` and verify branding

## Current Architecture

- **Routing**: Subdomain-based (`acme.capital`, `techcorp.capital`)
- **Tenant Resolution**: Automatic via middleware on all `/api` routes
- **Data Isolation**: TenantId filtering on all database queries
- **Branding**: Logo, colors, tagline per tenant
- **Default Tenant**: `company.capital` (Avatar Human Capital)

## Important Notes

- ⚠️ **No wildcard DNS**: Each subdomain must be manually configured
- ✅ **SSL Auto**: Replit provisions SSL certificates automatically (5-10 min after DNS)
- 🔒 **Secure**: Complete data isolation between tenants
- 📊 **Scalable**: Works well for 5-50 customers

## For More Details

See `DNS_SETUP_GUIDE.md` for complete documentation.
