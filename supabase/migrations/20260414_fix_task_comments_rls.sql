-- Fix task_comments RLS - remove policy that allowed viewing all orgs' comments
DROP POLICY IF EXISTS "Users can view all comments" ON task_comments;
