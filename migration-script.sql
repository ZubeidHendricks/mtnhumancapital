-- Step 1: Add nullable tenant_id columns to all tables
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin INTEGER DEFAULT 0;
ALTER TABLE integrity_checks ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE recruitment_sessions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE onboarding_workflows ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;
ALTER TABLE recruitment_metrics ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;

-- Step 2: Add tagline to tenant_config
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Step 3: Make subdomain required and unique
UPDATE tenant_config SET subdomain = 'company' WHERE subdomain IS NULL OR subdomain = '';
ALTER TABLE tenant_config ALTER COLUMN subdomain SET NOT NULL;
ALTER TABLE tenant_config ADD CONSTRAINT IF NOT EXISTS tenant_config_subdomain_unique UNIQUE (subdomain);

-- Step 4: Backfill tenant_id for all existing data
UPDATE candidates SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE jobs SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE users SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE integrity_checks SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE recruitment_sessions SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE onboarding_workflows SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE interviews SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;
UPDATE recruitment_metrics SET tenant_id = 'dac75a0c-9f62-40ac-8bed-a3ea88a56938' WHERE tenant_id IS NULL;

-- Step 5: Add foreign keys and indexes (for performance)
ALTER TABLE candidates ADD CONSTRAINT IF NOT EXISTS candidates_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);
ALTER TABLE jobs ADD CONSTRAINT IF NOT EXISTS jobs_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);
ALTER TABLE integrity_checks ADD CONSTRAINT IF NOT EXISTS integrity_checks_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);
ALTER TABLE recruitment_sessions ADD CONSTRAINT IF NOT EXISTS recruitment_sessions_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);
ALTER TABLE onboarding_workflows ADD CONSTRAINT IF NOT EXISTS onboarding_workflows_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);
ALTER TABLE interviews ADD CONSTRAINT IF NOT EXISTS interviews_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);
ALTER TABLE recruitment_metrics ADD CONSTRAINT IF NOT EXISTS recruitment_metrics_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenant_config(id);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_id ON candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrity_checks_tenant_id ON integrity_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_sessions_tenant_id ON recruitment_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_tenant_id ON onboarding_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_tenant_id ON interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_metrics_tenant_id ON recruitment_metrics(tenant_id);
