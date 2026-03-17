-- Add Gmail integration columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255);
