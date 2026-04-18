-- Activity/audit events for important CRM actions.
-- This starts with athlete assignment and status history, then can be expanded
-- to documents, contracts, communications, and financial changes.

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_org_created
  ON activity_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_entity_created
  ON activity_events(organization_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_actor_created
  ON activity_events(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_event_type
  ON activity_events(event_type);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org activity events" ON activity_events;
CREATE POLICY "Users can view org activity events"
  ON activity_events FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Users can insert org activity events" ON activity_events;
CREATE POLICY "Users can insert org activity events"
  ON activity_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());
