# 🚀 Replit Deployment & Merge Guide

## ⚠️ IMPORTANT - READ FIRST

This branch contains a **complete multi-tenant payment and subscription management system**. Before merging and deploying, you MUST complete these critical steps.

---

## 📋 Pre-Merge Checklist

### 1. Review Changes

Total changes in this commit:
- ✅ 26 files modified/created
- ✅ 6,149 lines added
- ✅ 8 new API endpoints
- ✅ 3 new database tables
- ✅ 12 documentation files

**Major Features Added**:
1. Payment tracking system
2. Subscription management (4 tiers)
3. Tenant management dashboard
4. Module control (enable/disable per tenant)
5. Admin tenant switching
6. Interactive documentation page

### 2. Check Git Status

```bash
# Verify commit
git log -1 --stat

# Check branch
git branch

# View all changes
git diff HEAD~1 --stat
```

---

## 🗄️ CRITICAL: Database Migration Required

**⚠️ YOU MUST RUN THIS BEFORE DEPLOYING ⚠️**

### Step 1: Backup Database

```bash
# Create backup first!
pg_dump -U postgres -d your_database > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration

```bash
# Connect to your production database
psql -U postgres -d your_database_name -f migrations/add-subscription-tracking.sql
```

### Step 3: Verify Migration

```sql
-- Check new tables exist
\dt tenant_payments
\dt subscription_plans

-- Check tenant_config has new columns
\d tenant_config

-- Verify subscription plans inserted
SELECT * FROM subscription_plans ORDER BY sort_order;
```

### What the Migration Does

1. **Adds 9 new columns to `tenant_config`**:
   - subscription_tier
   - subscription_status
   - trial_ends_at
   - subscription_started_at
   - subscription_ends_at
   - last_payment_date
   - next_payment_date
   - payment_method
   - billing_email

2. **Creates `tenant_payments` table**:
   - Tracks all payment transactions
   - Stores amount, status, method, transaction ID
   - Links to tenant via foreign key

3. **Creates `subscription_plans` table**:
   - 4 predefined plans (Free, Basic, Professional, Enterprise)
   - Pricing and features for each tier
   - Module access configuration

4. **Updates existing tenants**:
   - Sets all to "trial" status
   - Sets trial end date to 30 days from creation
   - Defaults to "free" tier

---

## 🔑 Environment Variables

**⚠️ MUST BE SET IN REPLIT SECRETS ⚠️**

### Required Variables

```bash
# Already exists - verify it's set
DATABASE_URL=postgresql://user:password@host:port/database

# NEW - Must add this
ADMIN_API_KEY=<generate-strong-random-key>
```

### How to Set in Replit

1. Click "Tools" → "Secrets"
2. Add new secret:
   - Key: `ADMIN_API_KEY`
   - Value: Generate a strong random key (e.g., `openssl rand -hex 32`)

### Generate Admin Key

```bash
# Run this to generate a secure key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use this
openssl rand -hex 32
```

---

## 📦 Dependencies

All required packages are already in `package.json`. After merging:

```bash
# Replit will auto-install, but you can manually run:
npm install

# Verify all packages installed
npm ls date-fns
```

---

## 🔀 Merge Instructions

### If Using Replit's Git Integration

1. **Switch to Main Branch**:
   ```bash
   git checkout main
   ```

2. **Merge This Branch**:
   ```bash
   git merge <your-branch-name>
   ```

3. **Resolve Any Conflicts**:
   - If conflicts occur, Replit will show them
   - Resolve each conflict manually
   - Run `git add .` then `git commit`

4. **Push to Replit**:
   ```bash
   git push origin main
   ```

### If Merging Locally Then Pushing

1. **Pull latest**:
   ```bash
   git pull origin main
   ```

2. **Merge your branch**:
   ```bash
   git merge <branch-name>
   ```

3. **Push to remote**:
   ```bash
   git push origin main
   ```

4. **Replit will auto-detect and redeploy**

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment

```bash
# 1. Backup database (CRITICAL!)
pg_dump -U postgres -d db > backup.sql

# 2. Run migration
psql -U postgres -d db -f migrations/add-subscription-tracking.sql

# 3. Set environment variables in Replit Secrets
# ADMIN_API_KEY=<your-generated-key>
```

### Step 2: Deploy

```bash
# Replit auto-deploys on git push, but you can manually:
# 1. Click "Deploy" in Replit
# 2. Or restart the server
```

### Step 3: Verification

```bash
# 1. Check server starts without errors
# Look for: "Server running on port 5000"

# 2. Test endpoints
curl http://your-replit-app.repl.co/api/admin/tenants \
  -H "Authorization: Bearer $ADMIN_API_KEY"

# 3. Access new pages
# - http://your-replit-app.repl.co/platform-docs
# - http://your-replit-app.repl.co/tenant-management
```

---

## 🧪 Post-Deployment Testing

### Critical Tests

1. **Database Migration Successful**:
   ```sql
   SELECT COUNT(*) FROM subscription_plans; -- Should be 4
   SELECT COUNT(*) FROM tenant_payments; -- Should be 0 or more
   ```

2. **API Endpoints Working**:
   ```bash
   # Test admin endpoint
   curl -H "Authorization: Bearer $ADMIN_API_KEY" \
     http://your-app/api/admin/tenants
   ```

3. **UI Pages Loading**:
   - ✅ `/platform-docs` - Documentation page
   - ✅ `/tenant-management` - Management dashboard
   - ✅ `/admin-dashboard` - Should have tenant selector
   - ✅ `/customer-onboarding` - Tenant signup

4. **Tenant Isolation Works**:
   - Create test tenant
   - Verify data separation
   - Test module toggling

### Full Test Sequence

```bash
# 1. Create test tenant
curl -X POST http://your-app/api/public/tenant-config \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "subdomain": "testco",
    "industry": "Technology"
  }'

# 2. Record test payment
curl -X POST http://your-app/api/admin/tenants/<tenant-id>/payments \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 49900,
    "status": "completed",
    "paymentMethod": "bank_transfer"
  }'

# 3. Update subscription
curl -X PATCH http://your-app/api/admin/tenants/<tenant-id>/subscription \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionStatus": "active",
    "subscriptionTier": "basic"
  }'
```

---

## 📊 What's New - Quick Reference

### New Pages

| URL | Purpose | Access |
|-----|---------|--------|
| `/platform-docs` | Interactive documentation | All admins |
| `/tenant-management` | Payment & subscription control | Admin only |
| TenantSelector | Dropdown in navbar | Admin pages |

### New Database Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `tenant_payments` | Payment transactions | 0+ |
| `subscription_plans` | Pricing tiers | 4 |
| `tenant_config` (extended) | Subscription fields | Existing tenants |

### New API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/tenants` | List all tenants |
| GET | `/api/admin/tenants/:id/payments` | Payment history |
| POST | `/api/admin/tenants/:id/payments` | Record payment |
| PATCH | `/api/admin/tenants/:id/subscription` | Update subscription |
| POST | `/api/admin/impersonate-tenant` | Switch tenant view |
| GET | `/api/admin/subscription-plans` | Get pricing plans |
| PATCH | `/api/admin/payments/:id` | Update payment |
| POST | `/api/public/tenant-config` | Create tenant |

---

## 🚨 Troubleshooting

### Issue: Migration Fails

```bash
# Check if tables already exist
psql -U postgres -d db -c "\dt tenant_payments"

# If exists, drop and recreate (CAUTION!)
DROP TABLE IF EXISTS tenant_payments CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

# Then run migration again
psql -U postgres -d db -f migrations/add-subscription-tracking.sql
```

### Issue: Server Won't Start

```bash
# Check logs
cat .replit

# Verify environment variables
echo $ADMIN_API_KEY

# Check database connection
psql -U postgres -d db -c "SELECT 1"
```

### Issue: Admin Endpoints Return 401

```bash
# Verify ADMIN_API_KEY is set
# Check it's passed in Authorization header
curl -v http://your-app/api/admin/tenants \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### Issue: Pages Not Loading

```bash
# Clear build cache
rm -rf node_modules/.vite
npm run build

# Restart server
pkill -f "node"
npm run dev
```

---

## 📚 Documentation Access

### In-App Documentation

Navigate to: `http://your-replit-app.repl.co/platform-docs`

Includes:
- Complete system overview
- Feature documentation
- Step-by-step workflows
- API reference
- Setup instructions

### Markdown Documentation

All docs available in project root:
- `QUICK_START.md` - Quick reference
- `PAYMENT_MANAGEMENT_GUIDE.md` - Complete guide
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full details

---

## ✅ Deployment Checklist

Use this checklist to ensure safe deployment:

### Pre-Deployment
- [ ] Review all changes (`git diff HEAD~1`)
- [ ] Backup production database
- [ ] Generate and save `ADMIN_API_KEY`
- [ ] Set `ADMIN_API_KEY` in Replit Secrets
- [ ] Review migration script

### Deployment
- [ ] Merge branch to main
- [ ] Run database migration
- [ ] Verify migration successful (check tables)
- [ ] Push to Replit
- [ ] Wait for auto-deploy
- [ ] Check server logs for errors

### Post-Deployment
- [ ] Test `/platform-docs` page loads
- [ ] Test `/tenant-management` page loads
- [ ] Test admin API endpoints
- [ ] Create test tenant
- [ ] Record test payment
- [ ] Toggle test module
- [ ] Verify tenant isolation

### Final Verification
- [ ] All existing features still work
- [ ] No console errors in browser
- [ ] Database queries working
- [ ] New features accessible
- [ ] Documentation readable

---

## 🆘 Rollback Plan

If something goes wrong:

### 1. Rollback Code

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset (if not pushed to others)
git reset --hard HEAD~1
git push origin main --force
```

### 2. Rollback Database

```bash
# Restore from backup
psql -U postgres -d db < backup.sql

# Or manually drop new tables
DROP TABLE IF EXISTS tenant_payments CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

# Remove new columns from tenant_config
ALTER TABLE tenant_config DROP COLUMN IF EXISTS subscription_tier;
-- (repeat for other columns)
```

---

## 📞 Support

### If You Need Help

1. **Check documentation**: `/platform-docs` in app
2. **Read guides**: See markdown files in project root
3. **Check logs**: Replit console and browser console
4. **Review code**: All changes are well-commented

### Key Files to Review

- `migrations/add-subscription-tracking.sql` - Database changes
- `server/routes.ts` - API endpoints
- `shared/schema.ts` - Database schema
- `client/src/pages/tenant-management.tsx` - Management UI

---

## 🎯 Summary

**What You're Deploying**:
- Complete payment tracking system
- Subscription management (4 tiers)
- Tenant management dashboard
- Module control system
- Admin tenant switching
- Interactive documentation

**Critical Steps**:
1. ✅ Backup database
2. ✅ Run migration
3. ✅ Set `ADMIN_API_KEY`
4. ✅ Merge and deploy
5. ✅ Test thoroughly

**After Deployment**:
- Access documentation: `/platform-docs`
- Manage tenants: `/tenant-management`
- Control everything from admin dashboard

---

## 🎉 You're Ready!

Follow this guide step-by-step and you'll have a production-ready multi-tenant SaaS platform with complete payment and subscription management.

**Good luck with your deployment!** 🚀

---

**Last Updated**: 2025-12-08  
**Commit**: 69ad34e  
**Files Changed**: 26  
**Status**: Ready for Production ✅
