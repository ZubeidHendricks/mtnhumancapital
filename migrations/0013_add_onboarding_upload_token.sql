-- Add self-service document upload token to onboarding_workflows
ALTER TABLE onboarding_workflows
ADD COLUMN IF NOT EXISTS upload_token VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS upload_token_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS onboarding_workflows_upload_token_idx
ON onboarding_workflows(upload_token);
