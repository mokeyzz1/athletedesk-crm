-- Add provider-neutral auth column for email/password + Google support
-- This enables users to sign in with either method and link to same CRM account

-- Step 1: Add new column (nullable initially for migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id TEXT;

-- Step 2: Migrate existing Google users - their auth_user_id = google_sso_id
UPDATE users
SET auth_user_id = google_sso_id
WHERE google_sso_id IS NOT NULL
  AND auth_user_id IS NULL;

-- Step 3: Create index for fast lookups (not unique yet - allows email fallback linking)
CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON users(auth_user_id);

-- Step 4: Update RLS helper function to use new column
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Note: After migration settles and all users have auth_user_id,
-- run this to make it required and unique:
-- ALTER TABLE users ALTER COLUMN auth_user_id SET NOT NULL;
-- CREATE UNIQUE INDEX users_auth_user_id_unique ON users(auth_user_id);
