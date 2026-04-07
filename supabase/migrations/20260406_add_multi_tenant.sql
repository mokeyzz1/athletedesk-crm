-- Multi-Tenant Architecture Migration
-- Adds organization support for data isolation between sports agencies

-- ============================================
-- PHASE 1: CREATE ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID,  -- Will reference users after users table is updated
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 2: ADD ORGANIZATION_ID TO ALL TABLES (NULLABLE FIRST)
-- ============================================

-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Communications log
ALTER TABLE communications_log ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Recruiting pipeline
ALTER TABLE recruiting_pipeline ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Brand outreach
ALTER TABLE brand_outreach ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Financial tracking
ALTER TABLE financial_tracking ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Task comments
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Comment mentions
ALTER TABLE comment_mentions ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Email templates
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Outreach goals
ALTER TABLE outreach_goals ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Roster teams
ALTER TABLE roster_teams ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Region assignments
ALTER TABLE region_assignments ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Recruiting regions
ALTER TABLE recruiting_regions ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================
-- PHASE 3: CREATE DEFAULT ORGANIZATION & MIGRATE DATA
-- ============================================

-- Create default organization for existing data
INSERT INTO organizations (id, name, slug, settings)
SELECT
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Default Agency',
  'default-agency',
  '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE slug = 'default-agency'
);

-- Update all existing records to belong to default organization
UPDATE users SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE athletes SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE communications_log SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE recruiting_pipeline SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE brand_outreach SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE financial_tracking SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE documents SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE tasks SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE task_comments SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE comment_mentions SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE email_templates SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE outreach_goals SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE roster_teams SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE region_assignments SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE recruiting_regions SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Set owner of default org to first admin user
UPDATE organizations
SET owner_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1)
WHERE slug = 'default-agency' AND owner_id IS NULL;

-- ============================================
-- PHASE 4: ADD FOREIGN KEY CONSTRAINTS
-- ============================================

-- Add FK to organizations for owner
ALTER TABLE organizations
  ADD CONSTRAINT fk_organizations_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add FKs for organization_id on all tables
ALTER TABLE users
  ADD CONSTRAINT fk_users_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE athletes
  ADD CONSTRAINT fk_athletes_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE communications_log
  ADD CONSTRAINT fk_communications_log_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE recruiting_pipeline
  ADD CONSTRAINT fk_recruiting_pipeline_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE brand_outreach
  ADD CONSTRAINT fk_brand_outreach_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE financial_tracking
  ADD CONSTRAINT fk_financial_tracking_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE documents
  ADD CONSTRAINT fk_documents_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE task_comments
  ADD CONSTRAINT fk_task_comments_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE comment_mentions
  ADD CONSTRAINT fk_comment_mentions_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE email_templates
  ADD CONSTRAINT fk_email_templates_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE outreach_goals
  ADD CONSTRAINT fk_outreach_goals_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE roster_teams
  ADD CONSTRAINT fk_roster_teams_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE region_assignments
  ADD CONSTRAINT fk_region_assignments_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE recruiting_regions
  ADD CONSTRAINT fk_recruiting_regions_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================
-- PHASE 5: ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_athletes_organization ON athletes(organization_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_organization ON communications_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_pipeline_organization ON recruiting_pipeline(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_outreach_organization ON brand_outreach(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_tracking_organization ON financial_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_organization ON task_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_organization ON comment_mentions(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_organization ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_outreach_goals_organization ON outreach_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_roster_teams_organization ON roster_teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_region_assignments_organization ON region_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_regions_organization ON recruiting_regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================
-- PHASE 6: UPDATE HELPER FUNCTIONS
-- ============================================

-- Update get_current_user_id to handle both Google SSO and email/password
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users
  WHERE google_sso_id = auth.uid()::text
     OR id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;

-- New function to get current user's organization
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users
  WHERE google_sso_id = auth.uid()::text
     OR id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- PHASE 7: UPDATE RLS POLICIES
-- ============================================

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT TO authenticated
  USING (id = get_current_organization_id());

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE TO authenticated
  USING (owner_id = get_current_user_id())
  WITH CHECK (owner_id = get_current_user_id());

-- Allow creating organizations (for new signups)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- UPDATE EXISTING TABLE POLICIES
-- ============================================

-- USERS TABLE
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view org users"
  ON users FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert org users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (
    (get_user_role() = 'admin' AND organization_id = get_current_organization_id())
    OR NOT EXISTS (SELECT 1 FROM users)  -- Allow first user
  );

-- ATHLETES TABLE
DROP POLICY IF EXISTS "Authenticated users can view athletes" ON athletes;
CREATE POLICY "Users can view org athletes"
  ON athletes FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Staff can insert athletes" ON athletes;
CREATE POLICY "Staff can insert org athletes"
  ON athletes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent', 'scout', 'marketing')
  );

DROP POLICY IF EXISTS "Staff can update assigned athletes" ON athletes;
CREATE POLICY "Staff can update org athletes"
  ON athletes FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (
      get_user_role() = 'admin'
      OR assigned_scout_id = get_current_user_id()
      OR assigned_agent_id = get_current_user_id()
      OR assigned_marketing_lead_id = get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Admins can delete athletes" ON athletes;
CREATE POLICY "Admins can delete org athletes"
  ON athletes FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- COMMUNICATIONS LOG
DROP POLICY IF EXISTS "Authenticated users can view communications" ON communications_log;
CREATE POLICY "Users can view org communications"
  ON communications_log FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Staff can insert communications" ON communications_log;
CREATE POLICY "Staff can insert org communications"
  ON communications_log FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent', 'scout', 'marketing')
  );

DROP POLICY IF EXISTS "Staff can update own communications" ON communications_log;
CREATE POLICY "Staff can update org communications"
  ON communications_log FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (get_user_role() = 'admin' OR staff_member_id = get_current_user_id())
  );

DROP POLICY IF EXISTS "Admins can delete communications" ON communications_log;
CREATE POLICY "Admins can delete org communications"
  ON communications_log FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- RECRUITING PIPELINE
DROP POLICY IF EXISTS "Authenticated users can view pipeline" ON recruiting_pipeline;
CREATE POLICY "Users can view org pipeline"
  ON recruiting_pipeline FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Scouts and agents can insert pipeline" ON recruiting_pipeline;
CREATE POLICY "Staff can insert org pipeline"
  ON recruiting_pipeline FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent', 'scout')
  );

DROP POLICY IF EXISTS "Scouts and agents can update pipeline" ON recruiting_pipeline;
CREATE POLICY "Staff can update org pipeline"
  ON recruiting_pipeline FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent', 'scout')
  );

DROP POLICY IF EXISTS "Admins can delete pipeline entries" ON recruiting_pipeline;
CREATE POLICY "Admins can delete org pipeline"
  ON recruiting_pipeline FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- BRAND OUTREACH
DROP POLICY IF EXISTS "Authenticated users can view brand outreach" ON brand_outreach;
CREATE POLICY "Users can view org brand outreach"
  ON brand_outreach FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Marketing can insert brand outreach" ON brand_outreach;
CREATE POLICY "Staff can insert org brand outreach"
  ON brand_outreach FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent', 'marketing')
  );

DROP POLICY IF EXISTS "Staff can update own brand outreach" ON brand_outreach;
CREATE POLICY "Staff can update org brand outreach"
  ON brand_outreach FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (get_user_role() = 'admin' OR staff_member_id = get_current_user_id())
  );

DROP POLICY IF EXISTS "Admins can delete brand outreach" ON brand_outreach;
CREATE POLICY "Admins can delete org brand outreach"
  ON brand_outreach FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- FINANCIAL TRACKING
DROP POLICY IF EXISTS "Limited staff can view financials" ON financial_tracking;
CREATE POLICY "Staff can view org financials"
  ON financial_tracking FOR SELECT TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent', 'marketing')
  );

DROP POLICY IF EXISTS "Agents can insert financials" ON financial_tracking;
CREATE POLICY "Staff can insert org financials"
  ON financial_tracking FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent')
  );

DROP POLICY IF EXISTS "Admins can update financials" ON financial_tracking;
CREATE POLICY "Admins can update org financials"
  ON financial_tracking FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete financials" ON financial_tracking;
CREATE POLICY "Admins can delete org financials"
  ON financial_tracking FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- TASKS
DROP POLICY IF EXISTS "Users can view all tasks" ON tasks;
CREATE POLICY "Users can view org tasks"
  ON tasks FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Admins and agents can create tasks" ON tasks;
CREATE POLICY "Staff can create org tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() IN ('admin', 'agent')
  );

DROP POLICY IF EXISTS "Assignee or admin can update tasks" ON tasks;
CREATE POLICY "Staff can update org tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (get_user_role() = 'admin' OR assigned_to = get_current_user_id())
  );

DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
CREATE POLICY "Admins can delete org tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- TASK COMMENTS
DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
CREATE POLICY "Users can view org task comments"
  ON task_comments FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;
CREATE POLICY "Users can create org task comments"
  ON task_comments FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Authors can update their comments" ON task_comments;
CREATE POLICY "Authors can update org comments"
  ON task_comments FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND author_id = get_current_user_id()
  );

DROP POLICY IF EXISTS "Authors and admins can delete comments" ON task_comments;
CREATE POLICY "Authors can delete org comments"
  ON task_comments FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (author_id = get_current_user_id() OR get_user_role() = 'admin')
  );

-- COMMENT MENTIONS
DROP POLICY IF EXISTS "Users can view their mentions" ON comment_mentions;
CREATE POLICY "Users can view org mentions"
  ON comment_mentions FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Users can create mentions" ON comment_mentions;
CREATE POLICY "Users can create org mentions"
  ON comment_mentions FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Users can update their mentions" ON comment_mentions;
CREATE POLICY "Users can update org mentions"
  ON comment_mentions FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND mentioned_user_id = get_current_user_id()
  );

-- EMAIL TEMPLATES
DROP POLICY IF EXISTS "Users can view their own or shared templates" ON email_templates;
CREATE POLICY "Users can view org templates"
  ON email_templates FOR SELECT TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR is_shared = true OR get_user_role() = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert their own templates" ON email_templates;
CREATE POLICY "Users can create org templates"
  ON email_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Users can update their own templates" ON email_templates;
CREATE POLICY "Users can update org templates"
  ON email_templates FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR get_user_role() = 'admin')
  );

DROP POLICY IF EXISTS "Users can delete their own templates" ON email_templates;
CREATE POLICY "Users can delete org templates"
  ON email_templates FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR get_user_role() = 'admin')
  );

-- Admins full access policy (drop old one if exists)
DROP POLICY IF EXISTS "Admins have full access to email templates" ON email_templates;

-- OUTREACH GOALS
DROP POLICY IF EXISTS "Authenticated users can view outreach goals" ON outreach_goals;
CREATE POLICY "Users can view org goals"
  ON outreach_goals FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Admins can create outreach goals" ON outreach_goals;
CREATE POLICY "Admins can create org goals"
  ON outreach_goals FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update outreach goals" ON outreach_goals;
CREATE POLICY "Admins can update org goals"
  ON outreach_goals FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete outreach goals" ON outreach_goals;
CREATE POLICY "Admins can delete org goals"
  ON outreach_goals FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- ROSTER TEAMS
DROP POLICY IF EXISTS "Authenticated users can view roster teams" ON roster_teams;
CREATE POLICY "Users can view org roster teams"
  ON roster_teams FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Admins can insert roster teams" ON roster_teams;
CREATE POLICY "Admins can create org roster teams"
  ON roster_teams FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update roster teams" ON roster_teams;
CREATE POLICY "Admins can update org roster teams"
  ON roster_teams FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete roster teams" ON roster_teams;
CREATE POLICY "Admins can delete org roster teams"
  ON roster_teams FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- REGION ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can manage region assignments" ON region_assignments;
DROP POLICY IF EXISTS "All users can read region assignments" ON region_assignments;

CREATE POLICY "Users can view org region assignments"
  ON region_assignments FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

CREATE POLICY "Admins can manage org region assignments"
  ON region_assignments FOR ALL TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- RECRUITING REGIONS
DROP POLICY IF EXISTS "Authenticated users can view recruiting_regions" ON recruiting_regions;
DROP POLICY IF EXISTS "Admins can manage recruiting_regions" ON recruiting_regions;

CREATE POLICY "Users can view org recruiting regions"
  ON recruiting_regions FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

CREATE POLICY "Admins can manage org recruiting regions"
  ON recruiting_regions FOR ALL TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND get_user_role() = 'admin'
  );

-- DOCUMENTS (if RLS exists)
DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

CREATE POLICY "Users can view org documents"
  ON documents FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

CREATE POLICY "Users can upload org documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());

CREATE POLICY "Users can delete org documents"
  ON documents FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (uploaded_by = get_current_user_id() OR get_user_role() = 'admin')
  );

-- ============================================
-- PHASE 8: AUTO-POPULATE ORGANIZATION_ID TRIGGERS
-- ============================================

-- Function to auto-set organization_id from current user
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_current_organization_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for all tables
CREATE TRIGGER set_athletes_org_id
  BEFORE INSERT ON athletes
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_communications_log_org_id
  BEFORE INSERT ON communications_log
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_recruiting_pipeline_org_id
  BEFORE INSERT ON recruiting_pipeline
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_brand_outreach_org_id
  BEFORE INSERT ON brand_outreach
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_financial_tracking_org_id
  BEFORE INSERT ON financial_tracking
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_documents_org_id
  BEFORE INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_tasks_org_id
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_task_comments_org_id
  BEFORE INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_comment_mentions_org_id
  BEFORE INSERT ON comment_mentions
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_email_templates_org_id
  BEFORE INSERT ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_outreach_goals_org_id
  BEFORE INSERT ON outreach_goals
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_roster_teams_org_id
  BEFORE INSERT ON roster_teams
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_region_assignments_org_id
  BEFORE INSERT ON region_assignments
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_recruiting_regions_org_id
  BEFORE INSERT ON recruiting_regions
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON organizations TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
