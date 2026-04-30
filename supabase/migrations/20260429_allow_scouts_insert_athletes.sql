-- Allow scouts to insert athletes (in addition to admins and agents)
-- Scouts need this to import athletes from spreadsheets
-- Also cleans up duplicate policy from earlier migration

-- Drop both old policy names (different migrations used different names)
DROP POLICY IF EXISTS "Staff can create org athletes" ON athletes;
DROP POLICY IF EXISTS "Staff can insert org athletes" ON athletes;

-- Single clean policy: admins, agents, scouts can insert
CREATE POLICY "Staff can create org athletes"
  ON athletes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR has_any_role(ARRAY['agent', 'scout']::user_role[]))
  );
