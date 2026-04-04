-- Create roster_teams table
CREATE TABLE IF NOT EXISTS roster_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  regions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_roster_teams_updated_at ON roster_teams;
CREATE TRIGGER update_roster_teams_updated_at
  BEFORE UPDATE ON roster_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE roster_teams ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can view roster teams
CREATE POLICY "Authenticated users can view roster teams" ON roster_teams
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify roster teams
CREATE POLICY "Admins can insert roster teams" ON roster_teams
  FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update roster teams" ON roster_teams
  FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete roster teams" ON roster_teams
  FOR DELETE
  USING (get_user_role() = 'admin');

-- Grant permissions
GRANT ALL ON roster_teams TO authenticated;

-- Insert default roster teams
INSERT INTO roster_teams (name, regions) VALUES
  ('West Coast', ARRAY['West', 'Southwest']),
  ('South / Central', ARRAY['Southeast', 'Midwest']),
  ('East Coast', ARRAY['Northeast', 'International'])
ON CONFLICT (name) DO NOTHING;
