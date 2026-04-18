-- Fix RLS helper functions to use auth_user_id instead of google_sso_id
-- This ensures email/password users work correctly alongside Google OAuth users

-- Fix get_user_role() to use auth_user_id
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Fix get_current_user_id() to use auth_user_id
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Fix get_current_organization_id() to use auth_user_id
-- Preserves super admin viewing_organization_id behavior
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT organization_id, viewing_organization_id, is_super_admin
  INTO user_record
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  -- If super admin with viewing_organization_id set, use that
  IF user_record.is_super_admin AND user_record.viewing_organization_id IS NOT NULL THEN
    RETURN user_record.viewing_organization_id;
  END IF;

  -- Otherwise return their actual organization
  RETURN user_record.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
