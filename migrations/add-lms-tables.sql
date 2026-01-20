-- Migration: Add LMS (Learning Management System) Tables
-- Created: 2025-12-08
-- Description: Adds courses, assessments, gamification, and AI lecturers

-- ================================
-- Courses Table
-- ================================
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- compliance, technical, soft_skills, leadership
  difficulty TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  duration INTEGER, -- in minutes
  thumbnail_url TEXT,
  video_url TEXT,
  ai_lecturer_id VARCHAR,
  modules JSONB, -- [{id, title, lessons: [{id, title, content, videoUrl}]}]
  learning_objectives TEXT[],
  prerequisites TEXT[],
  tags TEXT[],
  status TEXT DEFAULT 'draft', -- draft, published, archived
  created_by VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS courses_tenant_id_idx ON courses(tenant_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses(status);

-- ================================
-- Assessments Table
-- ================================
CREATE TABLE IF NOT EXISTS assessments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  course_id VARCHAR REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- quiz, exam, assignment, practical
  questions JSONB NOT NULL, -- [{id, question, type, options, correctAnswer, points}]
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER, -- in minutes
  attempts INTEGER DEFAULT 3,
  delivery_method TEXT[], -- ['email', 'whatsapp', 'platform']
  schedule_type TEXT DEFAULT 'manual', -- manual, scheduled, on_completion
  scheduled_at TIMESTAMP,
  status TEXT DEFAULT 'draft',
  created_by VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS assessments_tenant_id_idx ON assessments(tenant_id);
CREATE INDEX IF NOT EXISTS assessments_course_id_idx ON assessments(course_id);

-- ================================
-- Learner Progress Table
-- ================================
CREATE TABLE IF NOT EXISTS learner_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
  progress INTEGER DEFAULT 0, -- percentage 0-100
  current_module INTEGER DEFAULT 0,
  current_lesson INTEGER DEFAULT 0,
  completed_lessons TEXT[] DEFAULT ARRAY[]::TEXT[],
  time_spent INTEGER DEFAULT 0, -- in minutes
  last_accessed_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS learner_progress_tenant_id_idx ON learner_progress(tenant_id);
CREATE INDEX IF NOT EXISTS learner_progress_user_id_idx ON learner_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_progress_course_id_idx ON learner_progress(course_id);

-- ================================
-- Assessment Attempts Table
-- ================================
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  assessment_id VARCHAR NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB, -- {questionId: answer}
  score INTEGER,
  passed INTEGER DEFAULT 0, -- 0 or 1
  time_spent INTEGER, -- in seconds
  attempt_number INTEGER DEFAULT 1,
  feedback TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS assessment_attempts_tenant_id_idx ON assessment_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS assessment_attempts_user_id_idx ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS assessment_attempts_assessment_id_idx ON assessment_attempts(assessment_id);

-- ================================
-- Gamification Badges Table
-- ================================
CREATE TABLE IF NOT EXISTS gamification_badges (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria JSONB NOT NULL, -- {type: 'course_completion', value: 5}
  points INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS gamification_badges_tenant_id_idx ON gamification_badges(tenant_id);

-- ================================
-- Learner Badges Table
-- ================================
CREATE TABLE IF NOT EXISTS learner_badges (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS learner_badges_tenant_id_idx ON learner_badges(tenant_id);
CREATE INDEX IF NOT EXISTS learner_badges_user_id_idx ON learner_badges(user_id);

-- ================================
-- Learner Points Table
-- ================================
CREATE TABLE IF NOT EXISTS learner_points (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  level INTEGER DEFAULT 1,
  rank INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS learner_points_tenant_id_idx ON learner_points(tenant_id);
CREATE INDEX IF NOT EXISTS learner_points_user_id_idx ON learner_points(user_id);

-- ================================
-- AI Lecturers Table
-- ================================
CREATE TABLE IF NOT EXISTS ai_lecturers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  voice_id TEXT, -- for text-to-speech
  personality TEXT, -- professional, friendly, authoritative
  specialization TEXT, -- compliance, technical, soft_skills
  tavus_persona_id TEXT, -- Tavus API persona ID
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_lecturers_tenant_id_idx ON ai_lecturers(tenant_id);

-- ================================
-- Insert Sample Data
-- ================================

-- Sample AI Lecturers
INSERT INTO ai_lecturers (tenant_id, name, personality, specialization, active) VALUES
  ('default', 'Dr. Sarah Chen', 'professional', 'compliance', 1),
  ('default', 'Mike Roberts', 'friendly', 'technical', 1),
  ('default', 'Emma Williams', 'authoritative', 'leadership', 1)
ON CONFLICT DO NOTHING;

-- Sample Badges
INSERT INTO gamification_badges (tenant_id, name, description, criteria, points, rarity) VALUES
  ('default', 'Quick Learner', 'Complete a course in under 2 hours', '{"type": "course_completion_time", "value": 120}'::jsonb, 100, 'epic'),
  ('default', 'Safety Champion', 'Complete all safety courses', '{"type": "category_completion", "value": "compliance"}'::jsonb, 200, 'rare'),
  ('default', 'Team Player', 'Participate in 5 group learning sessions', '{"type": "group_sessions", "value": 5}'::jsonb, 50, 'common'),
  ('default', 'Knowledge Seeker', 'Complete 10 courses', '{"type": "course_completion", "value": 10}'::jsonb, 500, 'legendary'),
  ('default', 'Perfect Score', 'Get 100% on any assessment', '{"type": "assessment_score", "value": 100}'::jsonb, 150, 'epic')
ON CONFLICT DO NOTHING;

-- Sample Course Categories (for reference)
COMMENT ON COLUMN courses.category IS 'Categories: compliance, technical, soft_skills, leadership, sales, customer_service';
COMMENT ON COLUMN courses.difficulty IS 'Difficulty: beginner, intermediate, advanced';
COMMENT ON COLUMN courses.status IS 'Status: draft, published, archived';

-- Sample Assessment Types (for reference)
COMMENT ON COLUMN assessments.type IS 'Types: quiz, exam, assignment, practical';
COMMENT ON COLUMN assessments.schedule_type IS 'Schedule: manual, scheduled, on_completion';

-- Update timestamp trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learner_progress_updated_at ON learner_progress;
CREATE TRIGGER update_learner_progress_updated_at BEFORE UPDATE ON learner_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learner_points_updated_at ON learner_points;
CREATE TRIGGER update_learner_points_updated_at BEFORE UPDATE ON learner_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- Verification Queries
-- ================================

-- Run these to verify installation:
-- SELECT COUNT(*) FROM courses;
-- SELECT COUNT(*) FROM assessments;
-- SELECT COUNT(*) FROM gamification_badges; -- Should be 5
-- SELECT COUNT(*) FROM ai_lecturers; -- Should be 3
-- \dt learner_* -- Should show learner_progress, learner_badges, learner_points

COMMENT ON TABLE courses IS 'LMS: Course catalog with content and metadata';
COMMENT ON TABLE assessments IS 'LMS: Assessments for courses (quizzes, exams)';
COMMENT ON TABLE learner_progress IS 'LMS: Track learner progress through courses';
COMMENT ON TABLE assessment_attempts IS 'LMS: Track learner assessment attempts and scores';
COMMENT ON TABLE gamification_badges IS 'LMS: Define achievement badges';
COMMENT ON TABLE learner_badges IS 'LMS: Track badges earned by learners';
COMMENT ON TABLE learner_points IS 'LMS: Track points, levels, and rankings';
COMMENT ON TABLE ai_lecturers IS 'LMS: AI personas for course delivery (Tavus integration)';

-- Migration complete
SELECT 'LMS tables created successfully!' as status;
