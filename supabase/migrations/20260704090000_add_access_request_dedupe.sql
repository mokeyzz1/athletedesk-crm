-- Race-safe duplicate protection for the public access-request endpoint.
-- Existing rows remain nullable; all new API submissions receive a daily key.

alter table access_requests
  add column if not exists dedupe_key text;

create unique index if not exists access_requests_dedupe_key_idx
  on access_requests (dedupe_key)
  where dedupe_key is not null;
