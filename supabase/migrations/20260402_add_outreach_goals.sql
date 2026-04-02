-- Outreach Goals Table for tracking staff communication targets
-- Run this in Supabase SQL Editor

-- ============================================
-- OUTREACH GOALS TABLE
-- ============================================

CREATE TYPE goal_period AS ENUM ('weekly', 'monthly');
CREATE TYPE goal_metric AS ENUM ('emails', 'calls', 'texts', 'all_communications');

CREATE TABLE outreach_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  metric goal_metric NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  period goal_period NOT NULL,
  -- If staff_id is NULL, applies to all staff. Otherwise specific to that user.
  staff_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- If role is set, applies to all users with that role
  target_role user_role,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outreach_goals_staff ON outreach_goals(staff_id);
CREATE INDEX idx_outreach_goals_role ON outreach_goals(target_role);
CREATE INDEX idx_outreach_goals_active ON outreach_goals(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_outreach_goals_updated_at
  BEFORE UPDATE ON outreach_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE outreach_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view outreach goals"
  ON outreach_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create outreach goals"
  ON outreach_goals FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update outreach goals"
  ON outreach_goals FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete outreach goals"
  ON outreach_goals FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Grant access
GRANT ALL ON outreach_goals TO authenticated;
