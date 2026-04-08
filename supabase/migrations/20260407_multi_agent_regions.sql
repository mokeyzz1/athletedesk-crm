-- Allow multiple agents and marketing users per region
-- Change from single foreign key to arrays

-- Add new array columns
ALTER TABLE region_assignments
  ADD COLUMN IF NOT EXISTS agent_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS marketing_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_marketing_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Migrate existing data to new columns
UPDATE region_assignments
SET
  agent_ids = CASE WHEN default_agent_id IS NOT NULL THEN ARRAY[default_agent_id] ELSE '{}' END,
  marketing_ids = CASE WHEN default_marketing_id IS NOT NULL THEN ARRAY[default_marketing_id] ELSE '{}' END,
  primary_agent_id = default_agent_id,
  primary_marketing_id = default_marketing_id
WHERE agent_ids = '{}' OR agent_ids IS NULL;

-- Add organization_id to region_assignments for multi-tenancy
ALTER TABLE region_assignments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_region_assignments_org ON region_assignments(organization_id);
