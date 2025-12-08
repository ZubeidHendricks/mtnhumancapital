# 🚀 Instructions for Replit Team

## URGENT: New Payment & Subscription System Ready for Deployment

Hi Replit Team,

I've completed a major feature update that adds complete payment tracking and subscription management to the platform. Everything is committed and ready to merge/deploy.

---

## ⚠️ CRITICAL: You MUST Do These 3 Things BEFORE Deploying

### 1. Backup the Database (MANDATORY!)

```bash
pg_dump -U postgres -d your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Why:** We're adding new tables and fields. If anything goes wrong, you need a backup to restore.

---

### 2. Generate and Set Admin API Key (REQUIRED!)

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output, then:
1. In Replit, click **"Tools" → "Secrets"**
2. Add new secret:
   - **Key:** `ADMIN_API_KEY`
   - **Value:** (paste the generated key)
3. Click **"Save"**

**Why:** New admin endpoints require authentication with this key.

---

### 3. Run Database Migration (REQUIRED AFTER MERGE!)

After you pull/merge the code:

```bash
psql -U postgres -d your_database_name -f migrations/add-subscription-tracking.sql
```

**Why:** This creates 2 new tables and adds 9 fields to tenant_config.

---

## 📖 Step-by-Step Deployment Guide

### Step 1: Pull Latest Code

```bash
git pull origin main
```

### Step 2: Run the Migration

```bash
psql -U postgres -d your_database_name -f migrations/add-subscription-tracking.sql
```

### Step 3: Verify Migration Worked

```bash
psql -U postgres -d your_database_name
```

Then in psql:
```sql
\dt tenant_payments        -- Should exist
\dt subscription_plans     -- Should exist
SELECT COUNT(*) FROM subscription_plans;  -- Should return 4
\q
```

### Step 4: Restart Server

Replit should auto-deploy, but if needed:
```bash
# Or just restart in Replit UI
npm run dev
```

### Step 5: Test Deployment

Visit these URLs:
- ✅ `https://your-app.repl.co/platform-docs` - Should load documentation
- ✅ `https://your-app.repl.co/tenant-management` - Should load management page

Test admin endpoint:
```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://your-app.repl.co/api/admin/tenants
```

---

## 📚 Complete Documentation Available

I've created comprehensive guides for you:

### For Deployment
1. **`README_DEPLOYMENT.md`** - Start here! Quick overview
2. **`MERGE_CHECKLIST.md`** - Step-by-step checklist with checkboxes
3. **`REPLIT_DEPLOYMENT_GUIDE.md`** - Complete guide with troubleshooting

### For Understanding What's New
4. **`COMPLETE_IMPLEMENTATION_SUMMARY.md`** - Full feature overview
5. **`PAYMENT_MANAGEMENT_GUIDE.md`** - How to use payment system
6. **`QUICK_START.md`** - Quick reference guide

### In-App Documentation
7. Visit `/platform-docs` after deployment - Interactive documentation

---

## 🎯 What This Adds

### New Features
- 💰 **Payment Tracking** - Record and monitor all tenant payments
- 📊 **Subscription Management** - 4 tiers (Free Trial, Basic R499, Professional R999, Enterprise)
- 🔧 **Module Control** - Enable/disable features per tenant in real-time
- 👁️ **Tenant Switching** - Admins can view any tenant's workspace
- 📚 **Documentation** - Complete in-app guide at `/platform-docs`

### New Pages
- `/platform-docs` - Interactive system documentation
- `/tenant-management` - Payment & subscription dashboard

### New Database Tables
- `tenant_payments` - Payment transaction history
- `subscription_plans` - Subscription tier definitions (4 plans)
- `tenant_config` - Extended with 9 subscription fields

### New API Endpoints (8 total)
- `GET /api/admin/tenants` - List all tenants
- `GET /api/admin/tenants/:id/payments` - Get payment history
- `POST /api/admin/tenants/:id/payments` - Record payment
- `PATCH /api/admin/tenants/:id/subscription` - Update subscription
- `POST /api/admin/impersonate-tenant` - Switch tenant view
- `GET /api/admin/subscription-plans` - Get pricing plans
- More documented in `/platform-docs`

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] `/platform-docs` page loads
- [ ] `/tenant-management` page loads
- [ ] Admin API returns tenant list (with ADMIN_API_KEY)
- [ ] Can record a test payment
- [ ] Can toggle a module on/off
- [ ] Can switch tenant view in admin navbar
- [ ] All existing features still work

---

## 🚨 If Something Goes Wrong (Rollback)

### Rollback Code
```bash
git log --oneline -5  # Find commit before the merge
git reset --hard <commit-hash-before-merge>
git push origin main --force
```

### Restore Database
```bash
psql -U postgres -d your_database < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Summary

**Files Changed:** 29 files (3 pages, 14 docs, 12 components/routes)  
**Lines Added:** 6,000+  
**API Endpoints Added:** 8  
**Database Tables:** 2 new, 1 extended  
**Deployment Time:** ~15-20 minutes  
**Risk Level:** Medium (requires DB migration)  
**Rollback Time:** ~10 minutes  

---

## 🎯 Quick Commands Summary

```bash
# 1. Backup database (BEFORE merge)
pg_dump -U postgres -d db > backup.sql

# 2. Generate admin key (BEFORE merge)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Set in Replit Secrets as ADMIN_API_KEY

# 3. Pull code
git pull origin main

# 4. Run migration (AFTER merge)
psql -U postgres -d db -f migrations/add-subscription-tracking.sql

# 5. Verify migration
psql -U postgres -d db -c "\dt tenant_payments"
psql -U postgres -d db -c "SELECT COUNT(*) FROM subscription_plans"

# 6. Test
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://your-app/api/admin/tenants
```

---

## 📞 Questions?

All documentation is in the repo:
- **Start here:** `README_DEPLOYMENT.md`
- **Step-by-step:** `MERGE_CHECKLIST.md`
- **Detailed guide:** `REPLIT_DEPLOYMENT_GUIDE.md`

---

## ✅ Ready to Deploy!

Everything is committed, tested, and documented. Just follow the 5 steps above and you'll have a production-ready multi-tenant SaaS platform with complete payment and subscription management.

**Estimated Time:** 15-20 minutes  
**Status:** ✅ Production Ready  
**Last Updated:** December 8, 2025

Good luck! 🚀

---

**Important Files to Check After Pull:**
- ✅ `migrations/add-subscription-tracking.sql`
- ✅ `REPLIT_DEPLOYMENT_GUIDE.md`
- ✅ `MERGE_CHECKLIST.md`
- ✅ `client/src/pages/platform-docs.tsx`
- ✅ `client/src/pages/tenant-management.tsx`
