-- Fix RLS policies on integration tables for proper multi-tenancy

-- Fix contracts UPDATE policy - was allowing any admin cross-org
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;

CREATE POLICY "Users can update own org contracts" ON contracts
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (sent_by_user_id = get_current_user_id() OR get_user_role() = 'admin')
  )
  WITH CHECK (organization_id = get_current_organization_id());

-- Add missing DELETE policy for contracts
CREATE POLICY "Users can delete own contracts" ON contracts
  FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (sent_by_user_id = get_current_user_id() OR get_user_role() = 'admin')
  );

-- Add missing DELETE policy for apollo_contacts
CREATE POLICY "Users can delete own org apollo contacts" ON apollo_contacts
  FOR DELETE TO authenticated
  USING (organization_id = get_current_organization_id());

-- Fix calendar_events UPDATE/DELETE to also check organization_id
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;

CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE TO authenticated
  USING (organization_id = get_current_organization_id() AND user_id = get_current_user_id())
  WITH CHECK (organization_id = get_current_organization_id() AND user_id = get_current_user_id());

CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE TO authenticated
  USING (organization_id = get_current_organization_id() AND user_id = get_current_user_id());
