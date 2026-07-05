-- Read-only protection for the shared demo account.
--
-- The "Try the demo" button logs every visitor into one shared account
-- (demo@athletedesk.app). Without this, any visitor could delete the demo's
-- data and break it for everyone. This blocks row DELETES when — and only
-- when — the current session is the demo user.
--
-- Safe by construction:
--   * Fires only if auth.uid() maps to the demo user. Any other signed-in
--     user, and any service-role call (auth.uid() is null — server actions
--     with the service client, the seed script, admin tools), are unaffected.
--   * DELETE only. Inserts/updates still work, so the demo stays interactive.
--   * Fully reversible (drop the triggers + function).

create or replace function public.block_demo_deletes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.users
    where auth_user_id = auth.uid()::text
      and lower(email) = 'demo@athletedesk.app'
  ) then
    raise exception 'This is a read-only demo — sign up for a workspace to delete records.'
      using errcode = 'insufficient_privilege';
  end if;
  return old;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'athletes','communications_log','tasks','task_comments','brand_outreach',
    'financial_tracking','documents','recruiting_pipeline','roster_teams',
    'email_templates','recruiting_regions','region_assignments'
  ]
  loop
    execute format('drop trigger if exists block_demo_deletes on public.%I', t);
    execute format(
      'create trigger block_demo_deletes before delete on public.%I for each row execute function public.block_demo_deletes()',
      t
    );
  end loop;
end $$;
