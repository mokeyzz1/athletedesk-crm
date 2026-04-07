-- Organization Invites Table for Invite-Only Onboarding
-- Only users with valid invites can sign up for AthleteDesk

-- ============================================
-- CREATE ORGANIZATION_INVITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT, -- Optional: if set, only this email can use the invite
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Super admin who created it
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Pre-assigned org, or NULL for new org creation
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL, -- User who accepted
  invite_type TEXT NOT NULL DEFAULT 'new_org' CHECK (invite_type IN ('new_org', 'join_org')),
  metadata JSONB DEFAULT '{}', -- Extra data like notes, max_users, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_organization_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_organization_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_expires ON organization_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_organization_invites_created_by ON organization_invites(created_by);

-- ============================================
-- ADD SUPER_ADMIN COLUMN TO USERS
-- ============================================

-- Super admins can access /admin panel and manage all organizations
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Set moseskorom82@gmail.com as super admin (will be done when user exists)
-- This is handled in the auth callback after user creation

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all invites" ON organization_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND is_super_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND is_super_admin = true)
  );

-- Org admins can view invites for their org
CREATE POLICY "Org admins can view their org invites" ON organization_invites
  FOR SELECT TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND role = 'admin')
  );

-- Public can validate invites by token (for checking validity during signup)
-- This is a special policy that allows checking if a token is valid without auth
CREATE POLICY "Anyone can check invite validity by token" ON organization_invites
  FOR SELECT TO anon
  USING (
    accepted_at IS NULL
    AND expires_at > NOW()
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE id = get_current_user_id()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to validate an invite token
CREATE OR REPLACE FUNCTION validate_invite_token(invite_token TEXT)
RETURNS TABLE (
  invite_id UUID,
  invite_email TEXT,
  invite_type TEXT,
  organization_id UUID,
  organization_name TEXT
) AS $$
  SELECT
    oi.id AS invite_id,
    oi.email AS invite_email,
    oi.invite_type,
    oi.organization_id,
    o.name AS organization_name
  FROM organization_invites oi
  LEFT JOIN organizations o ON o.id = oi.organization_id
  WHERE oi.token = invite_token
    AND oi.accepted_at IS NULL
    AND oi.expires_at > NOW()
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to mark an invite as accepted
CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT, accepting_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record organization_invites%ROWTYPE;
BEGIN
  -- Get and lock the invite
  SELECT * INTO invite_record
  FROM organization_invites
  WHERE token = invite_token
    AND accepted_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if email restriction matches (if set)
  IF invite_record.email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = accepting_user_id
        AND email = invite_record.email
    ) THEN
      RETURN false;
    END IF;
  END IF;

  -- Mark as accepted
  UPDATE organization_invites
  SET accepted_at = NOW(),
      accepted_by = accepting_user_id,
      updated_at = NOW()
  WHERE id = invite_record.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_organization_invites_updated_at
  BEFORE UPDATE ON organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON organization_invites TO anon;
GRANT ALL ON organization_invites TO authenticated;
