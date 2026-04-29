-- Add is_admin_like() helper for super admin first-class support
-- Problem: Most policies use get_user_role() = 'admin' which ignores:
--   1. Super admins (is_super_admin = true)
--   2. Multi-role users with admin in roles[] but different primary_role

-- Step 1: Update is_super_admin() to use auth_user_id (consistency fix)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()::text
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create is_admin_like() - returns true if user has admin powers
-- This includes: super admins, users with admin in roles[], or role = 'admin'
CREATE OR REPLACE FUNCTION is_admin_like()
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT is_super_admin, roles, role INTO user_record
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  -- Super admin always has admin powers
  IF user_record.is_super_admin = true THEN
    RETURN true;
  END IF;

  -- Check roles[] array for admin
  IF user_record.roles IS NOT NULL AND array_length(user_record.roles, 1) > 0 THEN
    RETURN 'admin' = ANY(user_record.roles);
  END IF;

  -- Fallback to single role column
  RETURN user_record.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users INSERT (first user or admin)
DROP POLICY IF EXISTS "Users can be created by admins or first user" ON users;
CREATE POLICY "Users can be created by admins or first user"
  ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin_like() OR NOT EXISTS (SELECT 1 FROM users));

-- Users UPDATE (own record or admin)
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE TO authenticated
  USING (is_admin_like());

-- Users DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE TO authenticated
  USING (is_admin_like());

-- ============================================================================
-- ATHLETES TABLE POLICIES
-- ============================================================================

-- Athletes INSERT (admin or agent)
DROP POLICY IF EXISTS "Staff can create org athletes" ON athletes;
CREATE POLICY "Staff can create org athletes"
  ON athletes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR has_any_role(ARRAY['agent']::user_role[]))
  );

-- Athletes UPDATE (admin or assigned staff)
DROP POLICY IF EXISTS "Staff can update org athletes" ON athletes;
CREATE POLICY "Staff can update org athletes"
  ON athletes FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (
      is_admin_like() OR
      id = ANY(
        SELECT a.id FROM athletes a
        WHERE a.organization_id = get_current_organization_id()
        AND (
          get_current_user_id() = ANY(a.scout_ids) OR
          get_current_user_id() = ANY(a.agent_ids) OR
          get_current_user_id() = ANY(a.marketing_ids)
        )
      )
    )
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (
      is_admin_like() OR
      id = ANY(
        SELECT a.id FROM athletes a
        WHERE a.organization_id = get_current_organization_id()
        AND (
          get_current_user_id() = ANY(a.scout_ids) OR
          get_current_user_id() = ANY(a.agent_ids) OR
          get_current_user_id() = ANY(a.marketing_ids)
        )
      )
    )
  );

-- Athletes DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org athletes" ON athletes;
CREATE POLICY "Admins can delete org athletes"
  ON athletes FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- COMMUNICATIONS_LOG TABLE POLICIES
-- ============================================================================

-- Communications INSERT (staff can log)
DROP POLICY IF EXISTS "Staff can create org communications" ON communications_log;
CREATE POLICY "Staff can create org communications"
  ON communications_log FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR has_any_role(ARRAY['agent', 'scout', 'marketing']::user_role[]))
  );

-- Communications UPDATE (own or admin)
DROP POLICY IF EXISTS "Staff can update org communications" ON communications_log;
CREATE POLICY "Staff can update org communications"
  ON communications_log FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR staff_member_id = get_current_user_id())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR staff_member_id = get_current_user_id())
  );

-- Communications DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org communications" ON communications_log;
CREATE POLICY "Admins can delete org communications"
  ON communications_log FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- BRAND_OUTREACH TABLE POLICIES
-- ============================================================================

-- Brand outreach INSERT (admin or marketing)
DROP POLICY IF EXISTS "Staff can create org brand outreach" ON brand_outreach;
CREATE POLICY "Staff can create org brand outreach"
  ON brand_outreach FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR has_any_role(ARRAY['marketing']::user_role[]))
  );

-- Brand outreach UPDATE (own or admin)
DROP POLICY IF EXISTS "Staff can update org brand outreach" ON brand_outreach;
CREATE POLICY "Staff can update org brand outreach"
  ON brand_outreach FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR staff_member_id = get_current_user_id())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR staff_member_id = get_current_user_id())
  );

-- Brand outreach DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org brand outreach" ON brand_outreach;
CREATE POLICY "Admins can delete org brand outreach"
  ON brand_outreach FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- FINANCIAL_TRACKING TABLE POLICIES
-- ============================================================================

-- Financial INSERT (admin only)
DROP POLICY IF EXISTS "Admins can create org financials" ON financial_tracking;
CREATE POLICY "Admins can create org financials"
  ON financial_tracking FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Financial UPDATE (admin only)
DROP POLICY IF EXISTS "Admins can update org financials" ON financial_tracking;
CREATE POLICY "Admins can update org financials"
  ON financial_tracking FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Financial DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org financials" ON financial_tracking;
CREATE POLICY "Admins can delete org financials"
  ON financial_tracking FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- TASKS TABLE POLICIES (update existing multi-role policies)
-- ============================================================================

-- Tasks INSERT (admin or agent)
DROP POLICY IF EXISTS "Staff can create org tasks" ON tasks;
CREATE POLICY "Staff can create org tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR has_any_role(ARRAY['agent']::user_role[]))
  );

-- Tasks UPDATE (admin or assigned)
DROP POLICY IF EXISTS "Staff can update org tasks" ON tasks;
CREATE POLICY "Staff can update org tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR assigned_to = get_current_user_id())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (is_admin_like() OR assigned_to = get_current_user_id())
  );

-- Tasks DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org tasks" ON tasks;
CREATE POLICY "Admins can delete org tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- TASK_COMMENTS TABLE POLICIES
-- ============================================================================

-- Task comments UPDATE (own or admin)
DROP POLICY IF EXISTS "Users can update own task comments" ON task_comments;
CREATE POLICY "Users can update own task comments"
  ON task_comments FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (author_id = get_current_user_id() OR is_admin_like())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (author_id = get_current_user_id() OR is_admin_like())
  );

-- Task comments DELETE (own or admin)
DROP POLICY IF EXISTS "Users can delete own task comments" ON task_comments;
CREATE POLICY "Users can delete own task comments"
  ON task_comments FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (author_id = get_current_user_id() OR is_admin_like())
  );

-- ============================================================================
-- EMAIL_TEMPLATES TABLE POLICIES
-- ============================================================================

-- Email templates SELECT (own, shared, or admin)
DROP POLICY IF EXISTS "Users can view org email templates" ON email_templates;
CREATE POLICY "Users can view org email templates"
  ON email_templates FOR SELECT TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR is_shared = true OR is_admin_like())
  );

-- Email templates UPDATE (own or admin)
DROP POLICY IF EXISTS "Users can update own email templates" ON email_templates;
CREATE POLICY "Users can update own email templates"
  ON email_templates FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR is_admin_like())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR is_admin_like())
  );

-- Email templates DELETE (own or admin)
DROP POLICY IF EXISTS "Users can delete own email templates" ON email_templates;
CREATE POLICY "Users can delete own email templates"
  ON email_templates FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (created_by = get_current_user_id() OR is_admin_like())
  );

-- ============================================================================
-- RECRUITING_REGIONS TABLE POLICIES
-- ============================================================================

-- Regions INSERT (admin only)
DROP POLICY IF EXISTS "Admins can create org regions" ON recruiting_regions;
CREATE POLICY "Admins can create org regions"
  ON recruiting_regions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Regions UPDATE (admin only)
DROP POLICY IF EXISTS "Admins can update org regions" ON recruiting_regions;
CREATE POLICY "Admins can update org regions"
  ON recruiting_regions FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Regions DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org regions" ON recruiting_regions;
CREATE POLICY "Admins can delete org regions"
  ON recruiting_regions FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- REGION_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Region assignments INSERT (admin only)
DROP POLICY IF EXISTS "Admins can create org region assignments" ON region_assignments;
CREATE POLICY "Admins can create org region assignments"
  ON region_assignments FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Region assignments UPDATE (admin only)
DROP POLICY IF EXISTS "Admins can update org region assignments" ON region_assignments;
CREATE POLICY "Admins can update org region assignments"
  ON region_assignments FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Region assignments DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org region assignments" ON region_assignments;
CREATE POLICY "Admins can delete org region assignments"
  ON region_assignments FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- ROSTER_TEAMS TABLE POLICIES
-- ============================================================================

-- Roster teams INSERT (admin only)
DROP POLICY IF EXISTS "Admins can create org roster teams" ON roster_teams;
CREATE POLICY "Admins can create org roster teams"
  ON roster_teams FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Roster teams UPDATE (admin only)
DROP POLICY IF EXISTS "Admins can update org roster teams" ON roster_teams;
CREATE POLICY "Admins can update org roster teams"
  ON roster_teams FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Roster teams DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org roster teams" ON roster_teams;
CREATE POLICY "Admins can delete org roster teams"
  ON roster_teams FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- OUTREACH_GOALS TABLE POLICIES
-- ============================================================================

-- Outreach goals INSERT (admin only)
DROP POLICY IF EXISTS "Admins can create org outreach goals" ON outreach_goals;
CREATE POLICY "Admins can create org outreach goals"
  ON outreach_goals FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Outreach goals UPDATE (admin only)
DROP POLICY IF EXISTS "Admins can update org outreach goals" ON outreach_goals;
CREATE POLICY "Admins can update org outreach goals"
  ON outreach_goals FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Outreach goals DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org outreach goals" ON outreach_goals;
CREATE POLICY "Admins can delete org outreach goals"
  ON outreach_goals FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Documents UPDATE (own or admin)
DROP POLICY IF EXISTS "Users can update org documents" ON documents;
CREATE POLICY "Users can update org documents"
  ON documents FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (uploaded_by = get_current_user_id() OR is_admin_like())
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND (uploaded_by = get_current_user_id() OR is_admin_like())
  );

-- Documents DELETE (own or admin)
DROP POLICY IF EXISTS "Users can delete org documents" ON documents;
CREATE POLICY "Users can delete org documents"
  ON documents FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND (uploaded_by = get_current_user_id() OR is_admin_like())
  );

-- ============================================================================
-- ORGANIZATION_INVITES TABLE POLICIES
-- ============================================================================

-- Invites INSERT (admin only)
DROP POLICY IF EXISTS "Admins can create org invites" ON organization_invites;
CREATE POLICY "Admins can create org invites"
  ON organization_invites FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Invites UPDATE (admin only)
DROP POLICY IF EXISTS "Admins can update org invites" ON organization_invites;
CREATE POLICY "Admins can update org invites"
  ON organization_invites FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Invites DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org invites" ON organization_invites;
CREATE POLICY "Admins can delete org invites"
  ON organization_invites FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- ============================================================================
-- RECRUITING_PIPELINE TABLE POLICIES
-- ============================================================================

-- Pipeline UPDATE (admin only for now)
DROP POLICY IF EXISTS "Admins can update org pipeline" ON recruiting_pipeline;
CREATE POLICY "Admins can update org pipeline"
  ON recruiting_pipeline FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

-- Pipeline DELETE (admin only)
DROP POLICY IF EXISTS "Admins can delete org pipeline" ON recruiting_pipeline;
CREATE POLICY "Admins can delete org pipeline"
  ON recruiting_pipeline FOR DELETE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );
