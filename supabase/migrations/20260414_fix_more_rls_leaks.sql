-- Fix remaining RLS policy leaks across tables

-- Remove leaky documents policies (secure duplicates exist)
DROP POLICY IF EXISTS "Users can delete documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can update documents" ON documents;

-- Remove leaky comment_mentions policies (secure duplicates exist)
DROP POLICY IF EXISTS "Authenticated users can insert mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can mark mentions read" ON comment_mentions;

-- Fix notifications INSERT - was wide open, add org check
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Users can insert org notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());
