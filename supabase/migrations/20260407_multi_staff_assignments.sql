-- Allow multiple staff assignments per athlete
-- Add array columns for scouts, agents, and marketing leads

-- Add new array columns
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS scout_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS marketing_ids UUID[] DEFAULT '{}';

-- Migrate existing data to new columns
UPDATE athletes
SET
  scout_ids = CASE WHEN assigned_scout_id IS NOT NULL THEN ARRAY[assigned_scout_id] ELSE '{}' END,
  agent_ids = CASE WHEN assigned_agent_id IS NOT NULL THEN ARRAY[assigned_agent_id] ELSE '{}' END,
  marketing_ids = CASE WHEN assigned_marketing_lead_id IS NOT NULL THEN ARRAY[assigned_marketing_lead_id] ELSE '{}' END
WHERE scout_ids = '{}' OR scout_ids IS NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_athletes_scout_ids ON athletes USING GIN(scout_ids);
CREATE INDEX IF NOT EXISTS idx_athletes_agent_ids ON athletes USING GIN(agent_ids);
CREATE INDEX IF NOT EXISTS idx_athletes_marketing_ids ON athletes USING GIN(marketing_ids);
