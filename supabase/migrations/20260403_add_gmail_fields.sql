-- Add Gmail integration fields to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gmail_email TEXT;
