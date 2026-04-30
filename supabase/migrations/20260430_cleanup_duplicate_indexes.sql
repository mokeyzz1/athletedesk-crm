-- Cleanup duplicate indexes
-- These indexes are redundant - keeping the better named or more specific ones

-- athletes: keep idx_athletes_org, drop idx_athletes_organization
DROP INDEX IF EXISTS idx_athletes_organization;

-- athletes: keep partial indexes (more efficient), drop full ones
-- idx_athletes_agent (partial WHERE NOT NULL) is better than idx_athletes_assigned_agent
DROP INDEX IF EXISTS idx_athletes_assigned_agent;
DROP INDEX IF EXISTS idx_athletes_assigned_marketing;
DROP INDEX IF EXISTS idx_athletes_assigned_scout;

-- brand_outreach: keep idx_brand_outreach_org, drop idx_brand_outreach_organization
DROP INDEX IF EXISTS idx_brand_outreach_organization;

-- communications_log: keep idx_communications_org, drop idx_communications_log_organization
DROP INDEX IF EXISTS idx_communications_log_organization;

-- financial_tracking: keep idx_financial_org, drop idx_financial_tracking_organization
DROP INDEX IF EXISTS idx_financial_tracking_organization;

-- financial_tracking: keep idx_financial_payment_status, drop idx_financial_status
DROP INDEX IF EXISTS idx_financial_status;

-- tasks: keep idx_tasks_org, drop idx_tasks_organization
DROP INDEX IF EXISTS idx_tasks_organization;

-- region_assignments: keep idx_region_assignments_org, drop idx_region_assignments_organization
DROP INDEX IF EXISTS idx_region_assignments_organization;
