-- Add integrations table to store OAuth tokens and API keys for each user
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_calendar', 'calendly', 'docusign', 'apollo'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  api_key TEXT, -- For services that use API keys (like Apollo)
  account_email TEXT, -- The connected account's email
  account_name TEXT, -- Display name for the connected account
  settings JSONB DEFAULT '{}', -- Provider-specific settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one integration per provider
  UNIQUE(user_id, provider)
);

-- Add indexes
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX idx_user_integrations_org_id ON user_integrations(organization_id);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations" ON user_integrations
  FOR SELECT TO authenticated
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can insert own integrations" ON user_integrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update own integrations" ON user_integrations
  FOR UPDATE TO authenticated
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can delete own integrations" ON user_integrations
  FOR DELETE TO authenticated
  USING (user_id = get_current_user_id());

-- Trigger to auto-set organization_id
CREATE OR REPLACE FUNCTION set_integration_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (SELECT organization_id FROM users WHERE id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_integration_org_id
  BEFORE INSERT ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION set_integration_org_id();

-- Update timestamp trigger
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
