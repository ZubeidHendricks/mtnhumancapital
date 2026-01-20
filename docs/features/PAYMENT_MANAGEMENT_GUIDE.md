# Tenant Payment & Subscription Management

## Overview

Complete payment tracking and subscription management system for controlling tenant access to modules based on payment status.

## Features

✅ **Subscription Management** - Track subscription status (trial, active, suspended, cancelled)  
✅ **Payment Tracking** - Record and monitor all tenant payments  
✅ **Module Control** - Enable/disable modules based on subscription tier  
✅ **Payment History** - Complete transaction history per tenant  
✅ **Subscription Tiers** - Free, Basic, Professional, Enterprise plans  
✅ **Trial Management** - 30-day trial period tracking  
✅ **Billing Automation** - Next payment date tracking  

## Database Schema

### New Tables

#### `tenant_payments`
```sql
- id (uuid)
- tenant_id (uuid, FK to tenant_config)
- amount (integer, in cents)
- currency (text, default 'ZAR')
- status (text: pending, completed, failed, refunded)
- payment_method (text: card, bank_transfer, invoice)
- transaction_id (text)
- description (text)
- invoice_url (text)
- paid_at (timestamp)
- created_at, updated_at
```

#### `subscription_plans`
```sql
- id (uuid)
- name (text: free, basic, professional, enterprise)
- display_name (text)
- description (text)
- price_monthly (integer, in cents)
- price_yearly (integer, in cents)
- features (jsonb)
- modules_included (jsonb)
- limits (jsonb)
- is_active (integer)
- sort_order (integer)
- created_at, updated_at
```

### Extended Fields in `tenant_config`

```sql
- subscription_tier (text: free, basic, professional, enterprise)
- subscription_status (text: trial, active, suspended, cancelled)
- trial_ends_at (timestamp)
- subscription_started_at (timestamp)
- subscription_ends_at (timestamp)
- last_payment_date (timestamp)
- next_payment_date (timestamp)
- payment_method (text)
- billing_email (text)
```

## Subscription Tiers

### Free Trial
- **Price**: R0
- **Modules**: Recruitment only
- **Limits**: 10 candidates, 3 jobs, 1 user
- **Duration**: 30 days
- **Features**: Basic recruitment tools, Email support

### Basic Plan
- **Price**: R499/month or R4,999/year
- **Modules**: Recruitment, Integrity, Onboarding
- **Limits**: 100 candidates, 20 jobs, 5 users
- **Features**: 
  - All recruitment features
  - Integrity background checks
  - Onboarding automation
  - Email & chat support

### Professional Plan
- **Price**: R999/month or R9,999/year
- **Modules**: All (Recruitment, Integrity, Onboarding, HR Management)
- **Limits**: Unlimited candidates & jobs, 20 users
- **Features**:
  - All features included
  - AI-powered insights
  - Custom workflows
  - Priority support
  - Dedicated account manager

### Enterprise Plan
- **Price**: Custom pricing
- **Modules**: All with customization
- **Limits**: Unlimited everything
- **Features**:
  - Everything in Professional
  - Custom integrations
  - White-label options
  - SLA guarantee
  - 24/7 support
  - Training & onboarding

## API Endpoints

### Admin Endpoints

#### Get All Tenants
```
GET /api/admin/tenants
Auth: Admin required
```

#### Get Tenant Payments
```
GET /api/admin/tenants/:tenantId/payments
Auth: Admin required
Response: TenantPayment[]
```

#### Record Payment
```
POST /api/admin/tenants/:tenantId/payments
Auth: Admin required
Body: {
  amount: number (cents),
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  paymentMethod: 'card' | 'bank_transfer' | 'invoice',
  transactionId?: string,
  description?: string,
  paidAt?: timestamp
}
```

#### Update Payment Status
```
PATCH /api/admin/payments/:paymentId
Auth: Admin required
Body: {
  status: string,
  paidAt?: timestamp
}
```

#### Update Subscription
```
PATCH /api/admin/tenants/:tenantId/subscription
Auth: Admin required
Body: {
  subscriptionStatus?: 'trial' | 'active' | 'suspended' | 'cancelled',
  subscriptionTier?: 'free' | 'basic' | 'professional' | 'enterprise',
  modulesEnabled?: object,
  nextPaymentDate?: timestamp,
  billingEmail?: string
}
```

#### Get Subscription Plans
```
GET /api/admin/subscription-plans
Auth: Admin required
Response: SubscriptionPlan[]
```

## Usage Guide

### For Admins

#### Access Tenant Management
1. Navigate to `/tenant-management`
2. Or click Admin → Tenant Management in navbar

#### View Tenant Overview
- See total tenants, active subscriptions, trials
- View list of all tenants with key info

#### Manage a Tenant

**Select Tenant**:
1. Click "View" button on any tenant row
2. Tenant details appear below

**Update Subscription**:
1. Click "Update" in Subscription Details card
2. Change status, tier, payment date
3. Click "Update Subscription"

**Toggle Modules**:
- Use switches in Subscription Details card
- Modules activate/deactivate immediately
- Changes sync to tenant's workspace

**Record Payment**:
1. Click "Record Payment" in Payment History card
2. Enter amount (in rands)
3. Select status and payment method
4. Add transaction ID (optional)
5. Click "Record Payment"

#### Suspend Non-Paying Tenant
```
1. Find tenant in list
2. Click "View"
3. Click "Update" subscription
4. Change status to "Suspended"
5. All modules automatically disabled
```

#### Activate Paid Tenant
```
1. Record payment (will show in history)
2. Update subscription status to "Active"
3. Update next payment date
4. Enable relevant modules based on tier
```

### Common Workflows

#### New Tenant Trial
```
1. Tenant signs up via /customer-onboarding
2. Automatically set to:
   - Status: trial
   - Tier: free  
   - Trial ends: 30 days
   - Modules: recruitment only
3. Admin monitors in Tenant Management
```

#### Trial to Paid Conversion
```
1. Tenant contacts to upgrade
2. Admin records payment
3. Admin updates:
   - Status: active
   - Tier: basic/professional/enterprise
   - Next payment date: +30 days
4. Admin enables purchased modules
5. Tenant gets instant access
```

#### Handle Non-Payment
```
1. Payment date passes
2. Admin checks payment received
3. If no payment:
   - Status → suspended
   - Modules → disabled
   - Tenant cannot access system
4. When payment received:
   - Record payment
   - Status → active
   - Modules → re-enabled
```

#### Downgrade/Cancel
```
1. Tenant requests downgrade
2. Admin updates:
   - Tier: lower tier
   - Modules: disable premium modules
3. Or cancel:
   - Status: cancelled
   - All modules: disabled
   - Data: retained (not deleted)
```

## Module Control

### How It Works

1. **Admin changes module switch**
2. **API updates tenant_config.modulesEnabled**
3. **Frontend TenantContext reloads**
4. **Navbar shows/hides modules**
5. **Tenant sees updated menu instantly**

### Module Dependencies

```
free: [recruitment]
basic: [recruitment, integrity, onboarding]
professional: [all modules]
enterprise: [all modules + custom]
```

### Enforcement

**Backend**: 
- All API routes check `req.tenant.modulesEnabled`
- Return 403 if module not enabled

**Frontend**:
- `useTenant()` hook provides `isModuleEnabled()`
- Components check before rendering
- Navbar filters menu items

## Payment Workflows

### Manual Payment Recording

For bank transfers, invoices:
```
1. Tenant sends proof of payment
2. Admin verifies payment
3. Admin records in system:
   - Amount
   - Method: bank_transfer
   - Status: completed
   - Transaction ID from bank
4. System updates tenant status
```

### Automated Payment (Future)

When payment gateway integrated:
```
1. Tenant pays via card
2. Webhook receives payment
3. API creates payment record
4. Auto-updates subscription status
5. Sends confirmation email
```

## Reporting & Analytics

### Available Metrics

**In Tenant Management Page**:
- Total tenants
- Active subscriptions
- Trials
- Per-tenant payment history
- Total revenue per tenant

**Future Enhancements**:
- Monthly recurring revenue (MRR)
- Annual recurring revenue (ARR)
- Churn rate
- Conversion rate (trial → paid)
- Average revenue per tenant
- Payment success rate

## Migration

### Run Migration

```bash
# Using psql
psql -U postgres -d your_database -f migrations/add-subscription-tracking.sql

# Or using Drizzle (after configuring)
npm run db:migrate
```

### What Migration Does

1. ✅ Adds subscription fields to tenant_config
2. ✅ Creates tenant_payments table
3. ✅ Creates subscription_plans table
4. ✅ Inserts default subscription plans
5. ✅ Sets existing tenants to trial status
6. ✅ Creates database indexes

### Rollback

```sql
-- If needed to rollback
DROP TABLE IF EXISTS tenant_payments;
DROP TABLE IF EXISTS subscription_plans;

ALTER TABLE tenant_config DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE tenant_config DROP COLUMN IF EXISTS subscription_status;
-- ... (drop other columns)
```

## Security Considerations

### Access Control

- ✅ All admin endpoints require `requireAdmin` middleware
- ✅ Tenants cannot access other tenants' payment data
- ✅ Payment methods stored securely (no card details)
- ✅ Sensitive data isolated by tenant ID

### Best Practices

1. **Never store card details** - Use payment gateway tokens
2. **Log all payment actions** - Audit trail for compliance
3. **Encrypt sensitive data** - PII, billing info
4. **Validate amounts** - Prevent negative or zero payments
5. **Verify payments** - Match bank records to system records

## Testing

### Test Payment Recording

```bash
curl -X POST http://localhost:5000/api/admin/tenants/:tenantId/payments \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 49900,
    "status": "completed",
    "paymentMethod": "bank_transfer",
    "description": "Monthly subscription",
    "paidAt": "2025-12-07T00:00:00Z"
  }'
```

### Test Subscription Update

```bash
curl -X PATCH http://localhost:5000/api/admin/tenants/:tenantId/subscription \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionStatus": "active",
    "subscriptionTier": "professional",
    "nextPaymentDate": "2026-01-07T00:00:00Z"
  }'
```

### Test Module Toggle

```bash
curl -X PATCH http://localhost:5000/api/admin/tenants/:tenantId/subscription \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "modulesEnabled": {
      "recruitment": true,
      "integrity": false,
      "onboarding": true,
      "hr_management": false
    }
  }'
```

## UI Components

### Tenant Management Page

**Location**: `/tenant-management`

**Sections**:
1. **Overview Cards** - Stats at a glance
2. **Tenants Table** - All tenants with key info
3. **Subscription Details** - Selected tenant subscription
4. **Payment History** - Transaction list

**Features**:
- Real-time module toggling
- Payment recording dialog
- Subscription update dialog
- Status badges (color-coded)
- Search and filter (future)

## Future Enhancements

### Phase 2
- [ ] Automated payment reminders
- [ ] Invoice generation
- [ ] Payment gateway integration (Stripe/Paystack)
- [ ] Recurring payment setup
- [ ] Failed payment retry logic

### Phase 3
- [ ] Usage-based billing
- [ ] Overage charges
- [ ] Custom pricing per tenant
- [ ] Bulk operations
- [ ] Export payment reports

### Phase 4
- [ ] Self-service billing portal
- [ ] Upgrade/downgrade workflows
- [ ] Proration calculations
- [ ] Credit note system
- [ ] Referral program

## Troubleshooting

### Issue: Can't record payment

**Solutions**:
- Verify `ADMIN_API_KEY` is set
- Check tenant ID is valid
- Ensure amount is positive integer (in cents)

### Issue: Module doesn't disable

**Solutions**:
- Check `modulesEnabled` updated in database
- Clear localStorage on tenant's browser
- Verify tenant middleware is working

### Issue: Payment not showing

**Solutions**:
- Check `tenant_id` matches selected tenant
- Verify payment was successfully created
- Refresh payment list

## Files Modified

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Added payment & subscription tables |
| `server/storage.ts` | Added payment & plan methods |
| `server/routes.ts` | Added admin payment endpoints |
| `client/src/pages/tenant-management.tsx` | Tenant management UI |
| `client/src/App.tsx` | Added route |
| `client/src/components/layout/navbar.tsx` | Added menu item |
| `migrations/add-subscription-tracking.sql` | Database migration |

## Summary

Complete subscription and payment management system that allows:
- ✅ Track all tenant payments
- ✅ Control module access based on payment
- ✅ Suspend non-paying tenants
- ✅ Record manual payments
- ✅ Manage subscription status
- ✅ View payment history
- ✅ Monitor revenue per tenant

**Everything you need to run a paid multi-tenant SaaS platform!** 🎉
