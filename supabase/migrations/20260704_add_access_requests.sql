-- Access requests from the landing page "Request access" form.
-- No public RLS policies on purpose: all reads/writes go through API routes
-- using the service-role client (public POST validates + inserts server-side).

create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  agency text not null,
  email text not null,
  roster_size text,
  message text,
  status text not null default 'new', -- new | contacted | closed
  source text not null default 'landing'
);

alter table access_requests enable row level security;

create index if not exists access_requests_created_at_idx on access_requests (created_at desc);
