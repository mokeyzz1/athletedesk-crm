-- Allow scouts and marketing to create tasks (in addition to admins and agents)
-- Interns still cannot create tasks

DROP POLICY IF EXISTS "Staff can create org tasks" ON tasks;
CREATE POLICY "Staff can create org tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR has_any_role(ARRAY['agent', 'scout', 'marketing']::user_role[]))
  );
