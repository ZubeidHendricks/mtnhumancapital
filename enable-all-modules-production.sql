-- =====================================================
-- PRODUCTION: Enable All Modules for Tenant
-- =====================================================
-- Run this on your DigitalOcean PostgreSQL database
-- Replace 'company' with your actual subdomain if different

-- First, check current state
SELECT 
  id,
  subdomain,
  company_name,
  modules_enabled,
  updated_at
FROM tenant_config;

-- Enable all modules
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
  company_name,
  modules_enabled,
  updated_at
FROM tenant_config
WHERE subdomain = 'company';

-- List all enabled modules
SELECT 
  subdomain,
  jsonb_object_keys(modules_enabled) as module_name,
  (modules_enabled->jsonb_object_keys(modules_enabled))::boolean as is_enabled
FROM tenant_config
WHERE subdomain = 'company'
ORDER BY module_name;
