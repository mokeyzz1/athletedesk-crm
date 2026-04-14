-- Add email signature field to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_signature TEXT;

COMMENT ON COLUMN users.email_signature IS 'HTML email signature for outgoing emails';
