-- Fix recruiting_regions RLS and unique constraint for multi-tenancy

-- Remove overly permissive RLS policy that let users see all orgs' regions
DROP POLICY IF EXISTS "Authenticated users can view recruiting regions" ON recruiting_regions;

-- Fix unique constraint: change from (name) to (organization_id, name)
-- so each org can have regions with the same names
ALTER TABLE recruiting_regions DROP CONSTRAINT IF EXISTS recruiting_regions_name_key;
ALTER TABLE recruiting_regions ADD CONSTRAINT recruiting_regions_org_name_unique UNIQUE (organization_id, name);
