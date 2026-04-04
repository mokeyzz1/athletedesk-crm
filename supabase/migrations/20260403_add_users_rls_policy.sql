-- Add RLS policy to allow users to update their own record
-- This enables Gmail token storage and notification preferences to work

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own record
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (auth.uid()::text = google_sso_id OR auth.email() = email);

-- Allow users to update their own record (for Gmail tokens, notification prefs, etc.)
DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE
  USING (auth.uid()::text = google_sso_id OR auth.email() = email)
  WITH CHECK (auth.uid()::text = google_sso_id OR auth.email() = email);

-- Allow authenticated users to view all users (needed for team views)
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');
