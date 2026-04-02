-- AthleteDesk CRM Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'agent', 'scout', 'marketing', 'intern');
CREATE TYPE league_level AS ENUM ('high_school', 'college', 'professional', 'international');
CREATE TYPE recruiting_status AS ENUM ('not_recruiting', 'open_to_contact', 'actively_recruiting', 'committed', 'signed');
CREATE TYPE transfer_portal_status AS ENUM ('not_in_portal', 'entered_portal', 'committed', 'transferred');
CREATE TYPE communication_type AS ENUM ('email', 'call', 'text', 'zoom');
CREATE TYPE pipeline_stage AS ENUM (
  'prospect_identified',
  'scout_evaluation',
  'initial_contact',
  'recruiting_conversation',
  'interested',
  'signing_in_progress',
  'signed_client'
);
CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE outreach_method AS ENUM ('email', 'phone', 'linkedin', 'event');
CREATE TYPE response_status AS ENUM ('no_response', 'interested', 'not_interested', 'in_discussion', 'deal_closed');
CREATE TYPE payment_status AS ENUM ('pending', 'invoiced', 'paid');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

-- Recruiting database enums
CREATE TYPE class_year AS ENUM ('2025', '2026', '2027', '2028', '2029', '2030', 'pro', 'n_a');
CREATE TYPE outreach_status AS ENUM ('not_contacted', 'contacted', 'in_conversation', 'interested', 'committed', 'dead_lead', 'circling_back', 'signed');
CREATE TYPE deal_type AS ENUM ('revenue_share', 'marketing_brand');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'intern',
  google_sso_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_regions TEXT[] DEFAULT '{}'
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_sso_id ON users(google_sso_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- ATHLETES TABLE
-- ============================================

CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  school TEXT,
  sport TEXT NOT NULL,
  position TEXT,
  league_level league_level NOT NULL DEFAULT 'college',
  eligibility_year INTEGER,
  recruiting_status recruiting_status NOT NULL DEFAULT 'not_recruiting',
  transfer_portal_status transfer_portal_status NOT NULL DEFAULT 'not_in_portal',
  marketability_score INTEGER CHECK (marketability_score >= 0 AND marketability_score <= 100),
  sport_specific_stats JSONB DEFAULT '{}',
  assigned_scout_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_marketing_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
  profile_image_url TEXT,
  social_media JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Recruiting database fields
  class_year class_year DEFAULT 'n_a',
  region TEXT,
  outreach_status outreach_status DEFAULT 'not_contacted',
  last_contacted_date DATE
);

-- Indexes for athletes
CREATE INDEX idx_athletes_sport ON athletes(sport);
CREATE INDEX idx_athletes_school ON athletes(school);
CREATE INDEX idx_athletes_recruiting_status ON athletes(recruiting_status);
CREATE INDEX idx_athletes_transfer_portal_status ON athletes(transfer_portal_status);
CREATE INDEX idx_athletes_assigned_scout ON athletes(assigned_scout_id);
CREATE INDEX idx_athletes_assigned_agent ON athletes(assigned_agent_id);
CREATE INDEX idx_athletes_assigned_marketing ON athletes(assigned_marketing_lead_id);
CREATE INDEX idx_athletes_marketability ON athletes(marketability_score DESC);

-- ============================================
-- COMMUNICATIONS LOG TABLE
-- ============================================

CREATE TABLE communications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  communication_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type communication_type NOT NULL,
  subject TEXT,
  notes TEXT,
  follow_up_date DATE,
  follow_up_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for communications
CREATE INDEX idx_communications_athlete ON communications_log(athlete_id);
CREATE INDEX idx_communications_staff ON communications_log(staff_member_id);
CREATE INDEX idx_communications_date ON communications_log(communication_date DESC);
CREATE INDEX idx_communications_follow_up ON communications_log(follow_up_date) WHERE follow_up_completed = FALSE;

-- ============================================
-- RECRUITING PIPELINE TABLE
-- ============================================

CREATE TABLE recruiting_pipeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  pipeline_stage pipeline_stage NOT NULL DEFAULT 'prospect_identified',
  priority priority_level NOT NULL DEFAULT 'medium',
  last_contact_date DATE,
  next_action TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id) -- One pipeline entry per athlete
);

-- Indexes for recruiting pipeline
CREATE INDEX idx_pipeline_stage ON recruiting_pipeline(pipeline_stage);
CREATE INDEX idx_pipeline_priority ON recruiting_pipeline(priority);
CREATE INDEX idx_pipeline_last_contact ON recruiting_pipeline(last_contact_date DESC);

-- ============================================
-- BRAND OUTREACH TABLE
-- ============================================

CREATE TABLE brand_outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name TEXT NOT NULL,
  brand_contact_name TEXT,
  brand_contact_email TEXT,
  staff_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date_contacted DATE NOT NULL DEFAULT CURRENT_DATE,
  outreach_method outreach_method NOT NULL,
  response_status response_status NOT NULL DEFAULT 'no_response',
  follow_up_date DATE,
  deal_value DECIMAL(12, 2),
  product_value DECIMAL(12, 2),
  campaign_details TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for brand outreach
CREATE INDEX idx_brand_outreach_brand ON brand_outreach(brand_name);
CREATE INDEX idx_brand_outreach_athlete ON brand_outreach(athlete_id);
CREATE INDEX idx_brand_outreach_staff ON brand_outreach(staff_member_id);
CREATE INDEX idx_brand_outreach_status ON brand_outreach(response_status);
CREATE INDEX idx_brand_outreach_follow_up ON brand_outreach(follow_up_date) WHERE response_status NOT IN ('deal_closed', 'not_interested');

-- ============================================
-- FINANCIAL TRACKING TABLE
-- ============================================

CREATE TABLE financial_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  brand_outreach_id UUID REFERENCES brand_outreach(id) ON DELETE SET NULL,
  deal_name TEXT NOT NULL,
  deal_value DECIMAL(12, 2) NOT NULL,
  agency_percentage DECIMAL(5, 2) NOT NULL CHECK (agency_percentage >= 0 AND agency_percentage <= 100),
  agency_fee DECIMAL(12, 2) GENERATED ALWAYS AS (deal_value * agency_percentage / 100) STORED,
  athlete_payout DECIMAL(12, 2) GENERATED ALWAYS AS (deal_value - (deal_value * agency_percentage / 100)) STORED,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  deal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deal_type deal_type DEFAULT 'marketing_brand'
);

-- Indexes for financial tracking
CREATE INDEX idx_financial_athlete ON financial_tracking(athlete_id);
CREATE INDEX idx_financial_status ON financial_tracking(payment_status);
CREATE INDEX idx_financial_deal_date ON financial_tracking(deal_date DESC);
CREATE INDEX idx_financial_brand_outreach ON financial_tracking(brand_outreach_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON communications_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_updated_at
  BEFORE UPDATE ON recruiting_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_outreach_updated_at
  BEFORE UPDATE ON brand_outreach
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_updated_at
  BEFORE UPDATE ON financial_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiting_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_tracking ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE google_sso_id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get current user's id
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE google_sso_id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view all users (for dropdowns, assignments, etc.)
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (google_sso_id = auth.uid()::text)
  WITH CHECK (google_sso_id = auth.uid()::text);

-- Only admins can insert new users (or system via service role)
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin' OR NOT EXISTS (SELECT 1 FROM users));

-- Only admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- ATHLETES TABLE POLICIES
-- ============================================

-- All authenticated users can view athletes
CREATE POLICY "Authenticated users can view athletes"
  ON athletes FOR SELECT
  TO authenticated
  USING (true);

-- Scouts, agents, marketing, and admins can insert athletes
CREATE POLICY "Staff can insert athletes"
  ON athletes FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'agent', 'scout', 'marketing'));

-- Staff can update athletes they're assigned to, admins can update all
CREATE POLICY "Staff can update assigned athletes"
  ON athletes FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin' OR
    assigned_scout_id = get_current_user_id() OR
    assigned_agent_id = get_current_user_id() OR
    assigned_marketing_lead_id = get_current_user_id()
  )
  WITH CHECK (
    get_user_role() = 'admin' OR
    assigned_scout_id = get_current_user_id() OR
    assigned_agent_id = get_current_user_id() OR
    assigned_marketing_lead_id = get_current_user_id()
  );

-- Only admins can delete athletes
CREATE POLICY "Admins can delete athletes"
  ON athletes FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- COMMUNICATIONS LOG POLICIES
-- ============================================

-- All authenticated users can view communications
CREATE POLICY "Authenticated users can view communications"
  ON communications_log FOR SELECT
  TO authenticated
  USING (true);

-- Staff can insert communications (except interns view-only)
CREATE POLICY "Staff can insert communications"
  ON communications_log FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'agent', 'scout', 'marketing'));

-- Staff can update their own communications, admins can update all
CREATE POLICY "Staff can update own communications"
  ON communications_log FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin' OR
    staff_member_id = get_current_user_id()
  )
  WITH CHECK (
    get_user_role() = 'admin' OR
    staff_member_id = get_current_user_id()
  );

-- Admins can delete communications
CREATE POLICY "Admins can delete communications"
  ON communications_log FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- RECRUITING PIPELINE POLICIES
-- ============================================

-- All authenticated users can view pipeline
CREATE POLICY "Authenticated users can view pipeline"
  ON recruiting_pipeline FOR SELECT
  TO authenticated
  USING (true);

-- Scouts, agents, and admins can manage pipeline
CREATE POLICY "Scouts and agents can insert pipeline entries"
  ON recruiting_pipeline FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'agent', 'scout'));

CREATE POLICY "Scouts and agents can update pipeline"
  ON recruiting_pipeline FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'agent', 'scout'))
  WITH CHECK (get_user_role() IN ('admin', 'agent', 'scout'));

CREATE POLICY "Admins can delete pipeline entries"
  ON recruiting_pipeline FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- BRAND OUTREACH POLICIES
-- ============================================

-- All authenticated users can view brand outreach
CREATE POLICY "Authenticated users can view brand outreach"
  ON brand_outreach FOR SELECT
  TO authenticated
  USING (true);

-- Marketing and admins can insert brand outreach
CREATE POLICY "Marketing can insert brand outreach"
  ON brand_outreach FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'agent', 'marketing'));

-- Staff can update their own outreach, admins can update all
CREATE POLICY "Staff can update own brand outreach"
  ON brand_outreach FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin' OR
    staff_member_id = get_current_user_id()
  )
  WITH CHECK (
    get_user_role() = 'admin' OR
    staff_member_id = get_current_user_id()
  );

-- Admins can delete brand outreach
CREATE POLICY "Admins can delete brand outreach"
  ON brand_outreach FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- FINANCIAL TRACKING POLICIES
-- ============================================

-- Only agents, admins, and marketing can view financials
CREATE POLICY "Limited staff can view financials"
  ON financial_tracking FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'agent', 'marketing'));

-- Agents and admins can insert financial records
CREATE POLICY "Agents can insert financials"
  ON financial_tracking FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'agent'));

-- Only admins can update financials
CREATE POLICY "Admins can update financials"
  ON financial_tracking FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete financials
CREATE POLICY "Admins can delete financials"
  ON financial_tracking FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Dashboard summary view
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM athletes) AS total_athletes,
  (SELECT COUNT(*) FROM athletes WHERE recruiting_status = 'actively_recruiting') AS actively_recruiting,
  (SELECT COUNT(*) FROM athletes WHERE transfer_portal_status = 'entered_portal') AS in_portal,
  (SELECT COUNT(*) FROM recruiting_pipeline WHERE pipeline_stage = 'signed_client') AS signed_clients,
  (SELECT COUNT(*) FROM brand_outreach WHERE response_status = 'in_discussion') AS active_brand_discussions,
  (SELECT COALESCE(SUM(deal_value), 0) FROM financial_tracking WHERE payment_status = 'paid') AS total_revenue,
  (SELECT COALESCE(SUM(deal_value), 0) FROM financial_tracking WHERE payment_status = 'pending') AS pending_revenue;

-- Athletes with pipeline status view
CREATE OR REPLACE VIEW athletes_with_pipeline AS
SELECT
  a.*,
  rp.pipeline_stage,
  rp.priority,
  rp.last_contact_date,
  scout.name AS scout_name,
  agent.name AS agent_name,
  marketing.name AS marketing_lead_name
FROM athletes a
LEFT JOIN recruiting_pipeline rp ON a.id = rp.athlete_id
LEFT JOIN users scout ON a.assigned_scout_id = scout.id
LEFT JOIN users agent ON a.assigned_agent_id = agent.id
LEFT JOIN users marketing ON a.assigned_marketing_lead_id = marketing.id;

-- Pending follow-ups view
CREATE OR REPLACE VIEW pending_follow_ups AS
SELECT
  c.id,
  c.follow_up_date,
  c.subject,
  c.notes,
  a.name AS athlete_name,
  a.id AS athlete_id,
  u.name AS staff_name,
  u.id AS staff_id
FROM communications_log c
JOIN athletes a ON c.athlete_id = a.id
JOIN users u ON c.staff_member_id = u.id
WHERE c.follow_up_completed = FALSE
  AND c.follow_up_date IS NOT NULL
  AND c.follow_up_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY c.follow_up_date ASC;

-- Grant access to views
GRANT SELECT ON dashboard_summary TO authenticated;
GRANT SELECT ON athletes_with_pipeline TO authenticated;
GRANT SELECT ON pending_follow_ups TO authenticated;

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  due_date DATE,
  priority priority_level NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_athlete ON tasks(athlete_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and agents can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Assignee or admin can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin' OR
    assigned_to = get_current_user_id()
  )
  WITH CHECK (
    get_user_role() = 'admin' OR
    assigned_to = get_current_user_id()
  );

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Grant access to tasks table
GRANT ALL ON tasks TO authenticated;
