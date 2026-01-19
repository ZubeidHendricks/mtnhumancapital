-- Add LMS tables for courses, assessments, gamification, and certificates

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  modules JSONB DEFAULT '[]'::jsonb, -- [{id, title, lessons: [{id, title, content, videoUrl, duration}]}]
  learning_objectives TEXT[],
  prerequisites TEXT[],
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  created_by VARCHAR(255),
  duration_hours INTEGER DEFAULT 0,
  difficulty_level VARCHAR(50) DEFAULT 'beginner', -- beginner, intermediate, advanced
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_tenant_id ON courses(tenant_id);
CREATE INDEX idx_courses_status ON courses(status);

-- Course enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0, -- 0-100
  status VARCHAR(50) DEFAULT 'enrolled', -- enrolled, in_progress, completed, dropped
  completed_modules JSONB DEFAULT '[]'::jsonb, -- [moduleId1, moduleId2, ...]
  current_module_id VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, course_id, user_id)
);

CREATE INDEX idx_enrollments_tenant_id ON course_enrollments(tenant_id);
CREATE INDEX idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  module_id VARCHAR(255), -- optional: link to specific module
  title VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{id, question, type, options, correctAnswer, points}]
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived
  delivery_method VARCHAR(50) DEFAULT 'manual', -- manual, email, whatsapp, scheduled
  schedule_config JSONB, -- {frequency, dayOfWeek, time, recipients}
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_tenant_id ON assessments(tenant_id);
CREATE INDEX idx_assessments_course_id ON assessments(course_id);

-- Assessment attempts
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- {questionId: answer}
  score INTEGER,
  passed BOOLEAN DEFAULT false,
  time_taken_minutes INTEGER,
  attempt_number INTEGER DEFAULT 1,
  feedback TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_tenant_id ON assessment_attempts(tenant_id);
CREATE INDEX idx_attempts_user_id ON assessment_attempts(user_id);
CREATE INDEX idx_attempts_assessment_id ON assessment_attempts(assessment_id);

-- Gamification: User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(100) NOT NULL, -- badge, award, milestone
  achievement_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  points INTEGER DEFAULT 0,
  metadata JSONB, -- additional data like course_id, level, etc.
  earned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_tenant_id ON user_achievements(tenant_id);
CREATE INDEX idx_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);

-- Gamification: Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  assessments_passed INTEGER DEFAULT 0,
  badges_earned INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  rank INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_leaderboard_tenant_id ON leaderboard(tenant_id);
CREATE INDEX idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX idx_leaderboard_points ON leaderboard(total_points DESC);

-- Certificate templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_url TEXT NOT NULL, -- URL to uploaded template image/PDF
  template_type VARCHAR(50) DEFAULT 'image', -- image, pdf, html
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{key, label, x, y, fontSize, fontFamily, color}]
  is_default BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cert_templates_tenant_id ON certificate_templates(tenant_id);

-- Issued certificates
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  template_id INTEGER REFERENCES certificate_templates(id) ON DELETE SET NULL,
  certificate_number VARCHAR(255) UNIQUE NOT NULL,
  certificate_url TEXT, -- URL to generated certificate
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  metadata JSONB, -- {userName, courseName, grade, completionDate, etc.}
  verification_code VARCHAR(255) UNIQUE,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificates_tenant_id ON certificates(tenant_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);
CREATE INDEX idx_certificates_verification_code ON certificates(verification_code);

-- AI Lecturers / Video personas
CREATE TABLE IF NOT EXISTS ai_lecturers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  voice_id VARCHAR(255), -- for TTS integration
  persona_config JSONB, -- {style, tone, expertise, language}
  status VARCHAR(50) DEFAULT 'active',
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lecturers_tenant_id ON ai_lecturers(tenant_id);

-- AI-generated lesson videos
CREATE TABLE IF NOT EXISTS lesson_videos (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id VARCHAR(255),
  lesson_id VARCHAR(255),
  lecturer_id INTEGER REFERENCES ai_lecturers(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  script TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  generation_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  generation_metadata JSONB,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_tenant_id ON lesson_videos(tenant_id);
CREATE INDEX idx_videos_course_id ON lesson_videos(course_id);
CREATE INDEX idx_videos_lecturer_id ON lesson_videos(lecturer_id);

-- Add module controls to tenants table (payment-based features)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lms_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lms_max_courses INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_lecturers_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS certificates_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'trial'; -- trial, active, suspended, cancelled
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic'; -- basic, professional, enterprise
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
