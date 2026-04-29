-- Clean Role Model Migration
-- Separates admin (permission) from work roles (identity)
--
-- Target model:
--   is_admin: boolean (permission flag)
--   work_roles[]: scout, agent, marketing, intern (no admin)
--   primary_work_role: display badge
--
-- Old columns kept for compatibility: role, roles, primary_role

-- =============================================================================
-- STEP 1: Create work_role type (excludes admin)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_role') THEN
    CREATE TYPE work_role AS ENUM ('scout', 'agent', 'marketing', 'intern');
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Add new columns
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_roles work_role[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_work_role work_role;

-- =============================================================================
-- STEP 3: Backfill from existing data
-- =============================================================================

-- Set is_admin = true if user has admin anywhere
UPDATE users
SET is_admin = true
WHERE is_admin IS NOT true
  AND (
    role = 'admin'
    OR 'admin' = ANY(roles)
    OR primary_role = 'admin'
  );

-- Set is_admin = false for everyone else
UPDATE users
SET is_admin = false
WHERE is_admin IS NULL;

-- Build work_roles by filtering out 'admin' from existing roles
-- Cast to text first, then to work_role to handle the enum conversion
UPDATE users
SET work_roles = (
  SELECT ARRAY(
    SELECT r::text::work_role
    FROM unnest(roles) AS r
    WHERE r::text != 'admin'
  )
)
WHERE work_roles IS NULL OR array_length(work_roles, 1) IS NULL;

-- Set primary_work_role from primary_role (if not admin)
UPDATE users
SET primary_work_role = primary_role::text::work_role
WHERE primary_work_role IS NULL
  AND primary_role IS NOT NULL
  AND primary_role != 'admin';

-- If primary_role was admin, pick first work role as primary
UPDATE users
SET primary_work_role = work_roles[1]
WHERE primary_work_role IS NULL
  AND work_roles IS NOT NULL
  AND array_length(work_roles, 1) > 0;

-- =============================================================================
-- STEP 4: Set defaults for new users
-- =============================================================================

ALTER TABLE users
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN is_admin SET NOT NULL;

-- work_roles and primary_work_role can be null (pure admin with no work lane)

-- =============================================================================
-- STEP 5: Create index for work_roles array lookups
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_work_roles ON users USING GIN(work_roles);

-- =============================================================================
-- STEP 6: Update is_admin_like() to use new is_admin column
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin_like()
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT is_super_admin, is_admin, roles, role INTO user_record
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  -- Super admin always has admin powers
  IF user_record.is_super_admin = true THEN
    RETURN true;
  END IF;

  -- Check new is_admin flag first
  IF user_record.is_admin = true THEN
    RETURN true;
  END IF;

  -- Fallback: check roles[] array for 'admin' (compatibility)
  IF user_record.roles IS NOT NULL AND array_length(user_record.roles, 1) > 0 THEN
    RETURN 'admin' = ANY(user_record.roles);
  END IF;

  -- Fallback: check single role column (compatibility)
  RETURN user_record.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 7: Create has_work_role() helper (NO admin shortcut)
-- =============================================================================

CREATE OR REPLACE FUNCTION has_work_role(required_roles work_role[])
RETURNS BOOLEAN AS $$
DECLARE
  user_work_roles work_role[];
BEGIN
  SELECT work_roles INTO user_work_roles
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  -- Check if user has any of the required work roles
  IF user_work_roles IS NOT NULL AND array_length(user_work_roles, 1) > 0 THEN
    RETURN user_work_roles && required_roles;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 8: Create get_work_roles() helper
-- =============================================================================

CREATE OR REPLACE FUNCTION get_work_roles()
RETURNS work_role[] AS $$
  SELECT COALESCE(work_roles, ARRAY[]::work_role[])
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- STEP 9: Create get_primary_work_role() helper
-- =============================================================================

CREATE OR REPLACE FUNCTION get_primary_work_role()
RETURNS work_role AS $$
  SELECT primary_work_role
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- STEP 10: Update has_any_role() to use work_roles (compatibility bridge)
-- =============================================================================

-- This version checks work_roles first, then falls back to old roles[]
CREATE OR REPLACE FUNCTION has_any_role(required_roles user_role[])
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  required_work_roles work_role[];
BEGIN
  SELECT work_roles, roles, role INTO user_record
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  -- Filter out 'admin' from required_roles to get work roles only
  SELECT ARRAY(
    SELECT r::text::work_role
    FROM unnest(required_roles) AS r
    WHERE r::text != 'admin'
  ) INTO required_work_roles;

  -- Check if 'admin' was in required_roles and user is admin-like
  IF 'admin' = ANY(required_roles) THEN
    -- Check is_admin via the function
    IF is_admin_like() THEN
      RETURN true;
    END IF;
  END IF;

  -- Check work_roles for non-admin roles
  IF user_record.work_roles IS NOT NULL AND array_length(user_record.work_roles, 1) > 0 THEN
    IF user_record.work_roles && required_work_roles THEN
      RETURN true;
    END IF;
  END IF;

  -- Fallback: check old roles[] array
  IF user_record.roles IS NOT NULL AND array_length(user_record.roles, 1) > 0 THEN
    RETURN user_record.roles && required_roles;
  END IF;

  -- Fallback: check single role column
  RETURN user_record.role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
