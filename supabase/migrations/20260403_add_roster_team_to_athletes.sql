-- Add school_state and roster_team_id to athletes
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS school_state TEXT,
ADD COLUMN IF NOT EXISTS roster_team_id UUID REFERENCES roster_teams(id) ON DELETE SET NULL;

-- Add index for roster team lookups
CREATE INDEX IF NOT EXISTS idx_athletes_roster_team_id ON athletes(roster_team_id);
CREATE INDEX IF NOT EXISTS idx_athletes_school_state ON athletes(school_state);
