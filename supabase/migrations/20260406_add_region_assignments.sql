-- Region assignments table for automated handoffs
-- Maps regions to default agent and marketing users

CREATE TABLE IF NOT EXISTS region_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL UNIQUE,
  default_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  default_marketing_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE region_assignments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage region assignments
CREATE POLICY "Admins can manage region assignments"
  ON region_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Everyone can read region assignments (needed for handoff logic)
CREATE POLICY "All users can read region assignments"
  ON region_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Add handoff tracking fields to athletes
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS handoff_to_agent_at TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS handoff_to_marketing_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_region_assignments_region ON region_assignments(region);

-- Seed with default regions (no assignments yet)
INSERT INTO region_assignments (region) VALUES
  ('Northeast'),
  ('Southeast'),
  ('Midwest'),
  ('Southwest'),
  ('West'),
  ('International')
ON CONFLICT (region) DO NOTHING;
