-- Add interview_stage column to timeline tags for voice/video filtering
ALTER TABLE interview_timeline_tags ADD COLUMN IF NOT EXISTS interview_stage TEXT;

CREATE INDEX IF NOT EXISTS timeline_tags_interview_stage_idx ON interview_timeline_tags(interview_stage);
