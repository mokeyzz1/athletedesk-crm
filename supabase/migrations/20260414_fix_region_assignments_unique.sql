-- Fix region_assignments unique constraint for multi-tenancy
-- Change from unique on (region) to unique on (organization_id, region)

-- Drop the old unique constraint on region
ALTER TABLE region_assignments DROP CONSTRAINT IF EXISTS region_assignments_region_key;

-- Add new composite unique constraint
ALTER TABLE region_assignments
  ADD CONSTRAINT region_assignments_org_region_unique UNIQUE (organization_id, region);
