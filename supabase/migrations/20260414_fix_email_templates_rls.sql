-- Fix email_templates RLS - remove policies that leaked across orgs
DROP POLICY IF EXISTS "Users can view their own templates" ON email_templates;
DROP POLICY IF EXISTS "Admins have full access to templates" ON email_templates;

-- The remaining "Users can view org templates" policy properly filters by organization_id
