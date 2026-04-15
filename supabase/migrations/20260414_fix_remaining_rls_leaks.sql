-- Fix remaining RLS policies that leaked across organizations

-- recruiting_regions: DELETE and UPDATE policies without org filter
DROP POLICY IF EXISTS "Admins can delete recruiting regions" ON recruiting_regions;
DROP POLICY IF EXISTS "Admins can update recruiting regions" ON recruiting_regions;

-- task_comments: duplicate INSERT policy with with_check = true (allowing any insert)
DROP POLICY IF EXISTS "Authenticated users can comment" ON task_comments;

-- users: DELETE policy without org filter
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Recreate users DELETE policy with proper org filter
CREATE POLICY "Admins can delete org users" ON users
  FOR DELETE TO authenticated
  USING ((organization_id = get_current_organization_id()) AND (get_user_role() = 'admin'::user_role));
