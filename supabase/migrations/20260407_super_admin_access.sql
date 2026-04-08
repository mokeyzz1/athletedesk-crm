-- Allow super admin to view all data across organizations

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE (google_sso_id = auth.uid()::text OR id = auth.uid())
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update athletes SELECT policy to include super admin
DROP POLICY IF EXISTS "Users can view org athletes" ON athletes;
CREATE POLICY "Users can view org athletes" ON athletes
FOR SELECT USING (
  organization_id = get_current_organization_id()
  OR is_super_admin()
);

-- Update communications_log SELECT policy
DROP POLICY IF EXISTS "Users can view org communications" ON communications_log;
CREATE POLICY "Users can view org communications" ON communications_log
FOR SELECT USING (
  organization_id = get_current_organization_id()
  OR is_super_admin()
);

-- Update documents SELECT policy
DROP POLICY IF EXISTS "Users can view org documents" ON documents;
CREATE POLICY "Users can view org documents" ON documents
FOR SELECT USING (
  organization_id = get_current_organization_id()
  OR is_super_admin()
);

-- Update brands SELECT policy if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
    DROP POLICY IF EXISTS "Users can view org brands" ON brands;
    EXECUTE 'CREATE POLICY "Users can view org brands" ON brands FOR SELECT USING (organization_id = get_current_organization_id() OR is_super_admin())';
  END IF;
END $$;

-- Update tasks SELECT policy if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    DROP POLICY IF EXISTS "Users can view org tasks" ON tasks;
    EXECUTE 'CREATE POLICY "Users can view org tasks" ON tasks FOR SELECT USING (organization_id = get_current_organization_id() OR is_super_admin())';
  END IF;
END $$;

-- Update users SELECT policy to allow super admin to view all users
DROP POLICY IF EXISTS "Users can view org members" ON users;
CREATE POLICY "Users can view org members" ON users
FOR SELECT USING (
  organization_id = get_current_organization_id()
  OR is_super_admin()
  OR id = auth.uid()
  OR google_sso_id = auth.uid()::text
);

-- Update organizations SELECT policy to allow super admin to view all
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
CREATE POLICY "Users can view their organization" ON organizations
FOR SELECT USING (
  id = get_current_organization_id()
  OR is_super_admin()
);
