# ✅ Pre-Merge Checklist for Replit

## Status: Ready to Merge ✅

All code has been committed and is ready for deployment.

---

## 📋 What You Must Do Before Merging

### Step 1: Backup Everything (5 minutes)

```bash
# Backup database (CRITICAL!)
pg_dump -U postgres -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backup_*.sql

# Store backup somewhere safe
# Consider uploading to S3 or downloading locally
```

### Step 2: Set Environment Variable (2 minutes)

```bash
# Generate secure admin key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output, then:
# 1. Open Replit
# 2. Click "Tools" → "Secrets"
# 3. Add new secret:
#    Key: ADMIN_API_KEY
#    Value: <paste generated key>
# 4. Save
```

### Step 3: Review Changes (5 minutes)

```bash
# See what's being merged
git log -1 --stat

# Review commit message
git log -1

# Check all files changed
git diff HEAD~2 --stat
```

---

## 🔀 Merge Instructions

### Option A: Merge in Replit

1. Open Replit Git panel
2. Ensure you're on the correct branch
3. Click "Merge" or switch to main branch
4. Merge your branch into main
5. Resolve any conflicts if they appear
6. Commit the merge

### Option B: Merge via Command Line

```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Merge your branch
git merge <your-branch-name>

# Push to remote
git push origin main
```

---

## 🗄️ Run Database Migration

**⚠️ DO THIS IMMEDIATELY AFTER MERGE ⚠️**

```bash
# Connect to your database
psql -U postgres -d your_database_name

# Run the migration script
\i migrations/add-subscription-tracking.sql

# Verify tables created
\dt tenant_payments
\dt subscription_plans

# Check subscription plans inserted
SELECT id, name, display_name, price_monthly FROM subscription_plans ORDER BY sort_order;

# Expected output: 4 rows (Free Trial, Basic, Professional, Enterprise)

# Exit psql
\q
```

### What the Migration Creates

✅ **New Tables:**
- `tenant_payments` - Tracks all payment transactions
- `subscription_plans` - Defines pricing tiers

✅ **Extended Table:**
- `tenant_config` - Added 9 subscription fields:
  - subscription_tier
  - subscription_status
  - trial_ends_at
  - subscription_started_at
  - subscription_ends_at
  - last_payment_date
  - next_payment_date
  - payment_method
  - billing_email

✅ **Data Initialization:**
- 4 subscription plans inserted
- Existing tenants set to "trial" status
- Trial end dates calculated (30 days from creation)

---

## 🚀 Deploy

Replit will auto-deploy after you push to main.

### Monitor Deployment

1. Watch Replit console for:
   - "Server running on port 5000"
   - No error messages

2. Check build completed successfully

3. Visit your app URL

---

## 🧪 Verify Deployment

### Test 1: Check New Pages Load

```bash
# Should load without errors
curl -I http://your-replit-app.repl.co/platform-docs
curl -I http://your-replit-app.repl.co/tenant-management
```

### Test 2: Test Admin API

```bash
# Replace $ADMIN_API_KEY with your actual key
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://your-replit-app.repl.co/api/admin/tenants

# Should return JSON array of tenants
```

### Test 3: Verify Database

```sql
-- Connect to database
psql -U postgres -d your_database

-- Check tables exist
\dt tenant_payments
\dt subscription_plans

-- Check plans loaded
SELECT COUNT(*) FROM subscription_plans;  -- Should be 4

-- Check tenants have subscription data
SELECT id, company_name, subscription_status, subscription_tier 
FROM tenant_config 
LIMIT 5;
```

### Test 4: UI Verification

Visit these URLs in your browser:

- ✅ `/platform-docs` - Documentation page should load
- ✅ `/tenant-management` - Management dashboard should load
- ✅ `/admin-dashboard` - Should show tenant selector in navbar
- ✅ `/customer-onboarding` - Should still work

### Test 5: Feature Testing

1. **Record a test payment:**
   - Go to `/tenant-management`
   - Click "View" on any tenant
   - Click "Record Payment"
   - Enter amount, save
   - Verify appears in payment history

2. **Toggle a module:**
   - In tenant details, use toggle switches
   - Verify changes persist

3. **Switch tenant view:**
   - Click tenant selector dropdown
   - Select different tenant
   - Verify page reloads with new tenant data

---

## 📊 Expected Results

### After Successful Deployment

✅ **Database:**
- 3 new/extended tables
- 4 subscription plans
- All tenants have subscription fields

✅ **API:**
- 8 new admin endpoints working
- Authentication with ADMIN_API_KEY
- Existing endpoints still working

✅ **UI:**
- 2 new pages accessible
- 1 new component (TenantSelector)
- All existing pages still working

✅ **Features:**
- Payment tracking operational
- Subscription management ready
- Module control functional
- Tenant switching working

---

## 🚨 If Something Goes Wrong

### Quick Rollback

```bash
# Rollback code to previous version
git revert HEAD
git push origin main --force

# Restore database from backup
psql -U postgres -d your_database < backup_YYYYMMDD_HHMMSS.sql
```

### Common Issues

**Issue**: Server won't start
- **Fix**: Check Replit console for errors, verify ADMIN_API_KEY is set

**Issue**: Migration fails
- **Fix**: Check if tables already exist, review migration script

**Issue**: Admin endpoints return 401
- **Fix**: Verify ADMIN_API_KEY is correctly set in Replit Secrets

**Issue**: Pages not loading
- **Fix**: Clear build cache, restart server

### Get Help

📖 **Full Guide**: `REPLIT_DEPLOYMENT_GUIDE.md`  
📖 **Documentation**: `PAYMENT_MANAGEMENT_GUIDE.md`  
📖 **Quick Reference**: `QUICK_START.md`

---

## ✅ Final Checklist

Use this to track your progress:

### Pre-Merge
- [ ] Database backed up
- [ ] ADMIN_API_KEY generated and saved
- [ ] ADMIN_API_KEY set in Replit Secrets
- [ ] Changes reviewed

### Merge
- [ ] Merged to main branch
- [ ] Pushed to Replit
- [ ] No merge conflicts

### Post-Merge
- [ ] Database migration executed
- [ ] Migration verified (tables exist)
- [ ] Subscription plans loaded (4 rows)
- [ ] Server started successfully
- [ ] No errors in console

### Testing
- [ ] `/platform-docs` loads
- [ ] `/tenant-management` loads
- [ ] Admin API endpoints work
- [ ] Recorded test payment
- [ ] Toggled test module
- [ ] Switched tenant view

### Verification
- [ ] All existing features work
- [ ] New features accessible
- [ ] No console errors
- [ ] Database queries working

---

## 🎉 Success!

If all items checked, you're done! 

**Next Steps:**
1. Read documentation at `/platform-docs`
2. Start managing tenants at `/tenant-management`
3. Explore the new features

---

**Commit**: ee72b26  
**Files Changed**: 28  
**Status**: Ready for Production ✅  
**Date**: 2025-12-08
