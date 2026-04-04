-- Allow emails to be sent to non-athletes by making athlete_id nullable
-- and adding recipient tracking fields

-- Make athlete_id nullable
ALTER TABLE communications_log
ALTER COLUMN athlete_id DROP NOT NULL;

-- Add recipient fields for non-athlete communications
ALTER TABLE communications_log
ADD COLUMN recipient_email TEXT,
ADD COLUMN recipient_name TEXT;

-- Add comment explaining the change
COMMENT ON COLUMN communications_log.athlete_id IS 'Optional - can be NULL for emails sent to non-athletes';
COMMENT ON COLUMN communications_log.recipient_email IS 'Email address of recipient (for non-athlete communications)';
COMMENT ON COLUMN communications_log.recipient_name IS 'Name of recipient (for non-athlete communications)';
