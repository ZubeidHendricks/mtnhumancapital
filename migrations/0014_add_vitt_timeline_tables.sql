-- ViTT (Video/Interview Timeseries Tags) Database Tables
-- TimescaleDB-style timeline tagging for all interview types

-- Timeline Tags - ViTT-style timestamped markers on interview recordings
CREATE TABLE IF NOT EXISTS interview_timeline_tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR,
  session_id VARCHAR NOT NULL REFERENCES interview_sessions(id),
  recording_id VARCHAR REFERENCES interview_recordings(id),
  transcript_id VARCHAR REFERENCES interview_transcripts(id),

  tag_time TIMESTAMP NOT NULL,
  offset_ms INTEGER NOT NULL,
  end_offset_ms INTEGER,
  duration INTEGER,

  tag_type TEXT NOT NULL,
  tag_source TEXT NOT NULL DEFAULT 'auto',
  category TEXT,

  label TEXT NOT NULL,
  description TEXT,
  snippet TEXT,
  confidence REAL,

  emotion_scores JSONB,
  dominant_emotion TEXT,
  sentiment_score REAL,

  topics TEXT[],
  keywords TEXT[],

  speaker_role TEXT,
  speaker_name TEXT,

  importance INTEGER DEFAULT 5,
  ai_score REAL,

  created_by VARCHAR REFERENCES users(id),
  notes TEXT,
  is_bookmarked INTEGER DEFAULT 0,
  is_flagged INTEGER DEFAULT 0,

  provider_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS timeline_tags_tenant_id_idx ON interview_timeline_tags(tenant_id);
CREATE INDEX IF NOT EXISTS timeline_tags_session_id_idx ON interview_timeline_tags(session_id);
CREATE INDEX IF NOT EXISTS timeline_tags_recording_id_idx ON interview_timeline_tags(recording_id);
CREATE INDEX IF NOT EXISTS timeline_tags_tag_time_idx ON interview_timeline_tags(tag_time);
CREATE INDEX IF NOT EXISTS timeline_tags_offset_ms_idx ON interview_timeline_tags(offset_ms);
CREATE INDEX IF NOT EXISTS timeline_tags_tag_type_idx ON interview_timeline_tags(tag_type);
CREATE INDEX IF NOT EXISTS timeline_tags_tag_source_idx ON interview_timeline_tags(tag_source);
CREATE INDEX IF NOT EXISTS timeline_tags_category_idx ON interview_timeline_tags(category);
CREATE INDEX IF NOT EXISTS timeline_tags_importance_idx ON interview_timeline_tags(importance);

-- Transcript Jobs - Track multi-provider transcription runs
CREATE TABLE IF NOT EXISTS transcript_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR,
  session_id VARCHAR NOT NULL REFERENCES interview_sessions(id),
  recording_id VARCHAR REFERENCES interview_recordings(id),

  provider TEXT NOT NULL,
  provider_job_id TEXT,
  provider_model TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  language TEXT DEFAULT 'en',
  enable_speaker_diarization INTEGER DEFAULT 1,
  enable_sentiment_analysis INTEGER DEFAULT 1,
  enable_entity_detection INTEGER DEFAULT 0,
  enable_topic_detection INTEGER DEFAULT 1,
  enable_auto_highlights INTEGER DEFAULT 1,
  custom_vocabulary TEXT[],

  word_count INTEGER,
  segment_count INTEGER,
  speaker_count INTEGER,
  total_duration_ms INTEGER,
  average_confidence REAL,

  cost_cents INTEGER,
  audio_duration_seconds INTEGER,

  submitted_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transcript_jobs_tenant_id_idx ON transcript_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS transcript_jobs_session_id_idx ON transcript_jobs(session_id);
CREATE INDEX IF NOT EXISTS transcript_jobs_recording_id_idx ON transcript_jobs(recording_id);
CREATE INDEX IF NOT EXISTS transcript_jobs_provider_idx ON transcript_jobs(provider);
CREATE INDEX IF NOT EXISTS transcript_jobs_status_idx ON transcript_jobs(status);

-- Recording Sources - Track where recordings come from
CREATE TABLE IF NOT EXISTS recording_sources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR,
  session_id VARCHAR NOT NULL REFERENCES interview_sessions(id),
  recording_id VARCHAR REFERENCES interview_recordings(id),

  source_type TEXT NOT NULL,
  source_id TEXT,
  source_url TEXT,

  meeting_id TEXT,
  meeting_password TEXT,
  meeting_url TEXT,
  host_email TEXT,

  capture_config JSONB,
  is_audio_only INTEGER DEFAULT 0,
  has_video INTEGER DEFAULT 1,
  has_screen_share INTEGER DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,

  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recording_sources_tenant_id_idx ON recording_sources(tenant_id);
CREATE INDEX IF NOT EXISTS recording_sources_session_id_idx ON recording_sources(session_id);
CREATE INDEX IF NOT EXISTS recording_sources_recording_id_idx ON recording_sources(recording_id);
CREATE INDEX IF NOT EXISTS recording_sources_source_type_idx ON recording_sources(source_type);

-- LeMUR Analysis Results - Stored Q&A results from transcript analysis
CREATE TABLE IF NOT EXISTS lemur_analysis_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR,
  session_id VARCHAR NOT NULL REFERENCES interview_sessions(id),

  analysis_type TEXT NOT NULL,
  question TEXT,
  prompt TEXT,

  answer TEXT,
  structured_result JSONB,
  confidence REAL,

  provider TEXT NOT NULL DEFAULT 'groq',
  model TEXT,
  token_count INTEGER,

  requested_by VARCHAR REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lemur_analysis_tenant_id_idx ON lemur_analysis_results(tenant_id);
CREATE INDEX IF NOT EXISTS lemur_analysis_session_id_idx ON lemur_analysis_results(session_id);
CREATE INDEX IF NOT EXISTS lemur_analysis_type_idx ON lemur_analysis_results(analysis_type);
