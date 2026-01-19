-- Migration: Add subscription and payment tracking
-- Date: 2025-12-07

-- Add subscription and payment fields to tenant_config table
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Create tenant_payments table
CREATE TABLE IF NOT EXISTS tenant_payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenant_config(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  description TEXT,
  invoice_url TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_payments_tenant_id_idx ON tenant_payments(tenant_id);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER,
  price_yearly INTEGER,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  modules_included JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, modules_included, features, limits, sort_order)
VALUES
  (
    'free',
    'Free Trial',
    'Perfect for testing the platform',
    0,
    0,
    '{"recruitment": true, "integrity": false, "onboarding": false, "hr_management": false}'::jsonb,
    '["Up to 10 candidates", "Basic recruitment tools", "Email support"]'::jsonb,
    '{"candidates": 10, "jobs": 3, "users": 1}'::jsonb,
    0
  ),
  (
    'basic',
    'Basic Plan',
    'Great for small teams',
    49900, -- R499.00 in cents
    499900, -- R4,999.00 per year (2 months free)
    '{"recruitment": true, "integrity": true, "onboarding": true, "hr_management": false}'::jsonb,
    '["Up to 100 candidates", "All recruitment features", "Integrity checks", "Onboarding automation", "Email & chat support"]'::jsonb,
    '{"candidates": 100, "jobs": 20, "users": 5}'::jsonb,
    1
  ),
  (
    'professional',
    'Professional Plan',
    'For growing companies',
    99900, -- R999.00 in cents
    999900, -- R9,999.00 per year (2 months free)
    '{"recruitment": true, "integrity": true, "onboarding": true, "hr_management": true}'::jsonb,
    '["Unlimited candidates", "All features included", "AI-powered insights", "Custom workflows", "Priority support", "Dedicated account manager"]'::jsonb,
    '{"candidates": -1, "jobs": -1, "users": 20}'::jsonb,
    2
  ),
  (
    'enterprise',
    'Enterprise Plan',
    'For large organizations',
    NULL, -- Custom pricing
    NULL,
    '{"recruitment": true, "integrity": true, "onboarding": true, "hr_management": true}'::jsonb,
    '["Everything in Professional", "Custom integrations", "White-label options", "SLA guarantee", "24/7 support", "Training & onboarding"]'::jsonb,
    '{"candidates": -1, "jobs": -1, "users": -1}'::jsonb,
    3
  )
ON CONFLICT DO NOTHING;

-- Update existing tenants to have trial status and set trial end date (30 days from creation)
UPDATE tenant_config 
SET 
  subscription_status = 'trial',
  subscription_tier = 'free',
  trial_ends_at = created_at + INTERVAL '30 days'
WHERE subscription_status IS NULL;

-- Add comments for documentation
COMMENT ON TABLE tenant_payments IS 'Payment history and transaction records for each tenant';
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers and their features';
COMMENT ON COLUMN tenant_config.subscription_tier IS 'Current subscription plan: free, basic, professional, enterprise';
COMMENT ON COLUMN tenant_config.subscription_status IS 'Subscription state: trial, active, suspended, cancelled';
