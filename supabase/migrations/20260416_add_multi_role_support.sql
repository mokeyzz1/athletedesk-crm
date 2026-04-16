-- Multi-Role Support Migration (Phase 1)
-- Adds roles[] and primary_role columns while keeping role synced for RLS compatibility

-- Step 1: Add columns (with guards for re-run safety)
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles user_role[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_role user_role;

-- Step 2: Backfill from existing role column (handle both columns separately)
UPDATE users
SET roles = ARRAY[role]::user_role[]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

UPDATE users
SET primary_role = role
WHERE primary_role IS NULL;

-- Step 3: Set defaults for new rows
ALTER TABLE users
  ALTER COLUMN roles SET DEFAULT ARRAY['intern']::user_role[],
  ALTER COLUMN primary_role SET DEFAULT 'intern'::user_role;

-- Step 4: Make NOT NULL after backfill
ALTER TABLE users
  ALTER COLUMN roles SET NOT NULL,
  ALTER COLUMN primary_role SET NOT NULL;

-- Step 5: Index for array lookups
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- Step 6: Constraints (table-prefixed names, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_primary_role_in_roles') THEN
    ALTER TABLE users ADD CONSTRAINT users_primary_role_in_roles CHECK (primary_role = ANY(roles));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_roles_not_empty') THEN
    ALTER TABLE users ADD CONSTRAINT users_roles_not_empty CHECK (array_length(roles, 1) > 0);
  END IF;
END;
$$;
