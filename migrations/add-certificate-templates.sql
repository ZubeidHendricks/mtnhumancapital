-- Certificate Templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenant_config(id),
  name TEXT NOT NULL,
  description TEXT,
  template_url TEXT NOT NULL,
  template_type TEXT DEFAULT 'image' CHECK (template_type IN ('image', 'pdf')),
  placeholder_fields JSONB DEFAULT '[]'::jsonb,
  default_fields JSONB DEFAULT '{}'::jsonb,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Issued Certificates
CREATE TABLE IF NOT EXISTS issued_certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenant_config(id),
  template_id TEXT NOT NULL REFERENCES certificate_templates(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT REFERENCES courses(id),
  certificate_data JSONB NOT NULL,
  certificate_url TEXT NOT NULL,
  certificate_number TEXT UNIQUE,
  issued_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_certificate_templates_tenant ON certificate_templates(tenant_id);
CREATE INDEX idx_issued_certificates_tenant ON issued_certificates(tenant_id);
CREATE INDEX idx_issued_certificates_user ON issued_certificates(user_id);
CREATE INDEX idx_issued_certificates_course ON issued_certificates(course_id);
CREATE INDEX idx_certificate_number ON issued_certificates(certificate_number);
