-- Fix tasks RLS to support multi-role users
-- Problem: get_user_role() only returns the single `role` column,
-- but multi-role users may have admin/agent in roles[] with a different primary_role

-- Step 1: Create multi-role-aware helper function
CREATE OR REPLACE FUNCTION has_any_role(required_roles user_role[])
RETURNS BOOLEAN AS $$
DECLARE
  user_roles user_role[];
  single_role user_role;
BEGIN
  -- Get user's roles array and fallback single role
  SELECT roles, role INTO user_roles, single_role
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  -- If roles array exists and has values, check against it
  IF user_roles IS NOT NULL AND array_length(user_roles, 1) > 0 THEN
    RETURN user_roles && required_roles;
  END IF;

  -- Fallback to single role column
  RETURN single_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update tasks INSERT policy
DROP POLICY IF EXISTS "Staff can create org tasks" ON tasks;
CREATE POLICY "Staff can create org tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND has_any_role(ARRAY['admin', 'agent']::user_role[])
  );

-- Step 3: Update tasks UPDATE policy
DROP POLICY IF EXISTS "Staff can update org tasks" ON tasks;
CREATE POLICY "Staff can update org tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (has_any_role(ARRAY['admin']::user_role[]) OR assigned_to = get_current_user_id())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (has_any_role(ARRAY['admin']::user_role[]) OR assigned_to = get_current_user_id())
  );

-- Step 4: Update tasks DELETE policy
DROP POLICY IF EXISTS "Admins can delete org tasks" ON tasks;
CREATE POLICY "Admins can delete org tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND has_any_role(ARRAY['admin']::user_role[])
  );
