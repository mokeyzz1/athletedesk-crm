-- Create recruiting_regions table
CREATE TABLE IF NOT EXISTS recruiting_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  states TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_recruiting_regions_updated_at ON recruiting_regions;
CREATE TRIGGER update_recruiting_regions_updated_at
  BEFORE UPDATE ON recruiting_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE recruiting_regions ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can view recruiting regions
CREATE POLICY "Authenticated users can view recruiting regions" ON recruiting_regions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify recruiting regions
CREATE POLICY "Admins can insert recruiting regions" ON recruiting_regions
  FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update recruiting regions" ON recruiting_regions
  FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete recruiting regions" ON recruiting_regions
  FOR DELETE
  USING (get_user_role() = 'admin');

-- Grant permissions
GRANT ALL ON recruiting_regions TO authenticated;

-- Insert default recruiting regions with states
INSERT INTO recruiting_regions (name, states) VALUES
  ('Northwest', ARRAY['Washington', 'Oregon', 'Idaho', 'Montana', 'Wyoming', 'Alaska']),
  ('Southwest', ARRAY['California', 'Nevada', 'Arizona', 'Utah', 'Colorado', 'New Mexico', 'Hawaii']),
  ('South', ARRAY['Texas', 'Oklahoma', 'Arkansas', 'Louisiana']),
  ('Midwest', ARRAY['Kansas', 'Nebraska', 'Iowa', 'Missouri', 'North Dakota', 'South Dakota', 'Minnesota']),
  ('Great Lakes', ARRAY['Michigan', 'Ohio', 'Indiana', 'Illinois', 'Wisconsin']),
  ('Southeast', ARRAY['Florida', 'Georgia', 'Alabama', 'Mississippi', 'Tennessee', 'Kentucky', 'South Carolina', 'North Carolina', 'Virginia', 'West Virginia']),
  ('New England', ARRAY['Maine', 'New Hampshire', 'Vermont', 'Massachusetts', 'Rhode Island', 'Connecticut', 'New York', 'New Jersey', 'Pennsylvania', 'Delaware', 'Maryland', 'Washington DC'])
ON CONFLICT (name) DO NOTHING;
