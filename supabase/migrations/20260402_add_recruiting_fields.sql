-- Migration: Add recruiting database fields
-- Date: 2026-04-02
-- Description: Adds class_year, region, outreach_status to athletes,
--              assigned_regions to users, and deal_type to financial_tracking

-- ============================================
-- NEW ENUMS
-- ============================================

-- Class year for athletes (graduation/eligibility year)
CREATE TYPE class_year AS ENUM (
  '2025',
  '2026',
  '2027',
  '2028',
  '2029',
  '2030',
  'pro',
  'n_a'
);

-- Outreach status for recruiting tracking
CREATE TYPE outreach_status AS ENUM (
  'not_contacted',
  'contacted',
  'in_conversation',
  'interested',
  'committed',
  'dead_lead',
  'circling_back',
  'signed'
);

-- Deal type for financial tracking
CREATE TYPE deal_type AS ENUM (
  'revenue_share',
  'marketing_brand'
);

-- ============================================
-- ALTER ATHLETES TABLE
-- ============================================

-- Add class_year field
ALTER TABLE athletes ADD COLUMN class_year class_year DEFAULT 'n_a';

-- Add region field (TEXT for flexibility - Northeast, Southeast, Midwest, Southwest, West, International, or custom)
ALTER TABLE athletes ADD COLUMN region TEXT;

-- Add outreach_status field
ALTER TABLE athletes ADD COLUMN outreach_status outreach_status DEFAULT 'not_contacted';

-- Add last_contacted_date for tracking outreach
ALTER TABLE athletes ADD COLUMN last_contacted_date DATE;

-- Create indexes for new fields
CREATE INDEX idx_athletes_class_year ON athletes(class_year);
CREATE INDEX idx_athletes_region ON athletes(region);
CREATE INDEX idx_athletes_outreach_status ON athletes(outreach_status);

-- ============================================
-- ALTER USERS TABLE
-- ============================================

-- Add assigned_regions array for staff region assignments
ALTER TABLE users ADD COLUMN assigned_regions TEXT[] DEFAULT '{}';

-- Create index for region assignments
CREATE INDEX idx_users_assigned_regions ON users USING GIN(assigned_regions);

-- ============================================
-- ALTER FINANCIAL TRACKING TABLE
-- ============================================

-- Add deal_type field
ALTER TABLE financial_tracking ADD COLUMN deal_type deal_type DEFAULT 'marketing_brand';

-- Create index for deal_type
CREATE INDEX idx_financial_deal_type ON financial_tracking(deal_type);

-- ============================================
-- UPDATE VIEWS
-- ============================================

-- Drop and recreate athletes_with_pipeline view to include new fields
DROP VIEW IF EXISTS athletes_with_pipeline;

CREATE OR REPLACE VIEW athletes_with_pipeline AS
SELECT
  a.*,
  rp.pipeline_stage,
  rp.priority,
  rp.last_contact_date AS pipeline_last_contact_date,
  rp.next_action,
  rp.notes AS pipeline_notes,
  scout.name AS scout_name,
  agent.name AS agent_name,
  marketing.name AS marketing_lead_name
FROM athletes a
LEFT JOIN recruiting_pipeline rp ON a.id = rp.athlete_id
LEFT JOIN users scout ON a.assigned_scout_id = scout.id
LEFT JOIN users agent ON a.assigned_agent_id = agent.id
LEFT JOIN users marketing ON a.assigned_marketing_lead_id = marketing.id;

-- Grant access to updated view
GRANT SELECT ON athletes_with_pipeline TO authenticated;

-- ============================================
-- UPDATE DASHBOARD SUMMARY VIEW
-- ============================================

DROP VIEW IF EXISTS dashboard_summary;

CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM athletes) AS total_athletes,
  (SELECT COUNT(*) FROM athletes WHERE recruiting_status = 'actively_recruiting') AS actively_recruiting,
  (SELECT COUNT(*) FROM athletes WHERE transfer_portal_status = 'entered_portal') AS in_portal,
  (SELECT COUNT(*) FROM athletes WHERE outreach_status = 'signed') AS signed_clients,
  (SELECT COUNT(*) FROM brand_outreach WHERE response_status = 'in_discussion') AS active_brand_discussions,
  (SELECT COALESCE(SUM(deal_value), 0) FROM financial_tracking WHERE payment_status = 'paid') AS total_revenue,
  (SELECT COALESCE(SUM(deal_value), 0) FROM financial_tracking WHERE payment_status = 'pending') AS pending_revenue,
  -- New recruiting stats
  (SELECT COUNT(*) FROM athletes WHERE outreach_status != 'signed') AS total_recruits,
  (SELECT COUNT(*) FROM athletes WHERE outreach_status = 'not_contacted') AS not_contacted,
  (SELECT COUNT(*) FROM athletes WHERE outreach_status NOT IN ('not_contacted', 'signed')) AS contacted;

GRANT SELECT ON dashboard_summary TO authenticated;

-- ============================================
-- CREATE RECRUITING SUMMARY VIEW
-- ============================================

CREATE OR REPLACE VIEW recruiting_summary AS
SELECT
  region,
  class_year,
  COUNT(*) AS total_athletes,
  COUNT(*) FILTER (WHERE outreach_status = 'not_contacted') AS not_contacted,
  COUNT(*) FILTER (WHERE outreach_status != 'not_contacted' AND outreach_status != 'signed') AS contacted,
  COUNT(*) FILTER (WHERE outreach_status = 'signed') AS signed,
  ROUND(
    (COUNT(*) FILTER (WHERE outreach_status != 'not_contacted')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    1
  ) AS contact_percentage
FROM athletes
WHERE outreach_status != 'signed'
GROUP BY region, class_year
ORDER BY region, class_year;

GRANT SELECT ON recruiting_summary TO authenticated;
