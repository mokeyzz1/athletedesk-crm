-- Add viewing_organization_id column for super admin impersonation
ALTER TABLE users ADD COLUMN IF NOT EXISTS viewing_organization_id UUID REFERENCES organizations(id);

-- Update get_current_organization_id to check for impersonation
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get the user's org and impersonation settings
  SELECT organization_id, viewing_organization_id, is_super_admin
  INTO user_record
  FROM users
  WHERE google_sso_id = auth.uid()::text OR id = auth.uid()
  LIMIT 1;

  -- If super admin with viewing_organization_id set, use that
  IF user_record.is_super_admin AND user_record.viewing_organization_id IS NOT NULL THEN
    RETURN user_record.viewing_organization_id;
  END IF;

  -- Otherwise return their actual organization
  RETURN user_record.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
