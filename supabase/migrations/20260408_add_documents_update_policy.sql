-- Add missing UPDATE policy for documents table
-- Status changes were silently failing without this

CREATE POLICY "Users can update org documents"
  ON documents FOR UPDATE TO authenticated
  USING (organization_id = get_current_organization_id())
  WITH CHECK (organization_id = get_current_organization_id());
