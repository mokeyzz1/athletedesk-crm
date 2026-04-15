# RLS Policy Snapshot - April 14, 2026

This is the "known good" state of all Row Level Security policies after the multi-tenancy audit.

## Summary
- **22 tables** with RLS enabled
- **83 policies** total
- All policies properly filter by `organization_id` or `user_id` (via `auth.uid()`)
- No cross-org data leaks

## Policy List

| Table | Operation | Policy Name |
|-------|-----------|-------------|
| apollo_contacts | DELETE | Users can delete own org apollo contacts |
| apollo_contacts | INSERT | Users can insert apollo contacts |
| apollo_contacts | SELECT | Users can view own org apollo contacts |
| apollo_contacts | UPDATE | Users can update own org apollo contacts |
| athletes | DELETE | Admins can delete org athletes |
| athletes | INSERT | Staff can insert org athletes |
| athletes | SELECT | Users can view org athletes |
| athletes | UPDATE | Staff can update org athletes |
| brand_outreach | DELETE | Admins can delete org brand outreach |
| brand_outreach | INSERT | Staff can insert org brand outreach |
| brand_outreach | SELECT | Users can view org brand outreach |
| brand_outreach | UPDATE | Staff can update org brand outreach |
| calendar_events | DELETE | Users can delete own calendar events |
| calendar_events | INSERT | Users can insert own calendar events |
| calendar_events | SELECT | Users can view own org calendar events |
| calendar_events | UPDATE | Users can update own calendar events |
| comment_mentions | INSERT | Users can create org mentions |
| comment_mentions | SELECT | Users can view org mentions |
| comment_mentions | UPDATE | Users can update org mentions |
| communications_log | DELETE | Admins can delete org communications |
| communications_log | INSERT | Staff can insert org communications |
| communications_log | SELECT | Users can view org communications |
| communications_log | UPDATE | Staff can update org communications |
| contracts | DELETE | Users can delete own contracts |
| contracts | INSERT | Users can insert contracts |
| contracts | SELECT | Users can view own org contracts |
| contracts | UPDATE | Users can update own org contracts |
| documents | DELETE | Users can delete org documents |
| documents | INSERT | Users can upload org documents |
| documents | SELECT | Users can view org documents |
| documents | UPDATE | Users can update org documents |
| email_templates | DELETE | Users can delete org templates |
| email_templates | INSERT | Users can create org templates |
| email_templates | SELECT | Users can view org templates |
| email_templates | UPDATE | Users can update org templates |
| financial_tracking | DELETE | Admins can delete org financials |
| financial_tracking | INSERT | Staff can insert org financials |
| financial_tracking | SELECT | Staff can view org financials |
| financial_tracking | UPDATE | Admins can update org financials |
| notifications | INSERT | Users can insert org notifications |
| notifications | SELECT | Users can view own notifications |
| notifications | UPDATE | Users can update own notifications |
| organization_invites | ALL | Super admins can manage all invites |
| organization_invites | SELECT | Anyone can check invite validity by token |
| organization_invites | SELECT | Org admins can view their org invites |
| organizations | INSERT | Authenticated users can create organizations |
| organizations | SELECT | Users can view their organization |
| organizations | UPDATE | Owners can update their organization |
| outreach_goals | DELETE | Admins can delete org goals |
| outreach_goals | INSERT | Admins can create org goals |
| outreach_goals | SELECT | Users can view org goals |
| outreach_goals | UPDATE | Admins can update org goals |
| recruiting_pipeline | DELETE | Admins can delete org pipeline |
| recruiting_pipeline | INSERT | Staff can insert org pipeline |
| recruiting_pipeline | SELECT | Users can view org pipeline |
| recruiting_pipeline | UPDATE | Staff can update org pipeline |
| recruiting_regions | ALL | Admins can manage org recruiting regions |
| recruiting_regions | SELECT | Users can view org recruiting regions |
| region_assignments | ALL | Admins can manage org region assignments |
| region_assignments | SELECT | Users can view org region assignments |
| roster_teams | DELETE | Admins can delete org roster teams |
| roster_teams | INSERT | Admins can create org roster teams |
| roster_teams | SELECT | Users can view org roster teams |
| roster_teams | UPDATE | Admins can update org roster teams |
| task_comments | DELETE | Authors can delete org comments |
| task_comments | INSERT | Users can create org task comments |
| task_comments | SELECT | Users can view org task comments |
| task_comments | UPDATE | Authors can update org comments |
| tasks | DELETE | Admins can delete org tasks |
| tasks | INSERT | Staff can create org tasks |
| tasks | SELECT | Users can view org tasks |
| tasks | UPDATE | Staff can update org tasks |
| user_integrations | DELETE | Users can delete own integrations |
| user_integrations | INSERT | Users can insert own integrations |
| user_integrations | SELECT | Users can view own integrations |
| user_integrations | UPDATE | Users can update own integrations |
| users | DELETE | Admins can delete org users |
| users | INSERT | Admins can insert org users |
| users | INSERT | Users can insert own profile |
| users | SELECT | Users can view org members |
| users | SELECT | Users can view org users |
| users | UPDATE | Users can update own profile |
| users | UPDATE | Users can update own record |

## Key Security Functions

All policies rely on these helper functions:
- `get_current_organization_id()` - Returns the org_id of the authenticated user
- `get_current_user_id()` - Returns the internal user id of the authenticated user
- `get_user_role()` - Returns the role of the authenticated user
- `auth.uid()` - Supabase built-in, returns the auth user's UUID

## Notes

- `organizations` INSERT allows any authenticated user (intentional for signup)
- `organization_invites` SELECT allows checking validity by token (intentional for invite flow)
- `user_integrations` is user-scoped (not org-scoped) since OAuth tokens are per-user
- `notifications` SELECT/UPDATE use `auth.uid()` directly (user sees only their own)

## Verification Query

To regenerate this snapshot:
```sql
SELECT tablename, cmd, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```
