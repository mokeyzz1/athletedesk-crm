-- Migration: Add deal_stage column to brand_outreach and financial_tracking tables
-- This distinguishes between prospective deals (pitches to recruits) and active deals (for signed athletes)
-- Run this in Supabase SQL Editor if upgrading an existing database

-- Create the deal_stage enum type
DO $$ BEGIN
  CREATE TYPE deal_stage AS ENUM ('prospective', 'active');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add deal_stage column to brand_outreach
ALTER TABLE brand_outreach
ADD COLUMN IF NOT EXISTS deal_stage deal_stage NOT NULL DEFAULT 'prospective';

-- Add deal_stage column to financial_tracking
ALTER TABLE financial_tracking
ADD COLUMN IF NOT EXISTS deal_stage deal_stage NOT NULL DEFAULT 'prospective';

-- Update existing records: Set deals for signed athletes to 'active'
UPDATE brand_outreach bo
SET deal_stage = 'active'
FROM athletes a
WHERE bo.athlete_id = a.id
AND a.outreach_status = 'signed';

UPDATE financial_tracking ft
SET deal_stage = 'active'
FROM athletes a
WHERE ft.athlete_id = a.id
AND a.outreach_status = 'signed';

-- Add indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_brand_outreach_deal_stage ON brand_outreach(deal_stage);
CREATE INDEX IF NOT EXISTS idx_financial_deal_stage ON financial_tracking(deal_stage);
