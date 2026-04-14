-- Add roster-specific profile fields for signed athletes
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS hometown TEXT,
  ADD COLUMN IF NOT EXISTS mailing_address TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT,
  ADD COLUMN IF NOT EXISTS dream_partnership TEXT;

-- Add comments for documentation
COMMENT ON COLUMN athletes.birthday IS 'Athlete date of birth';
COMMENT ON COLUMN athletes.hometown IS 'Athlete hometown';
COMMENT ON COLUMN athletes.mailing_address IS 'Mailing address for contracts, merch, etc.';
COMMENT ON COLUMN athletes.interests IS 'Hobbies and interests outside of sport';
COMMENT ON COLUMN athletes.dream_partnership IS 'Brands athlete wants to work with';
