-- Scheduled Gmail sends and durable scheduled attachments.

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  gmail_message_id TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_org_status_time
  ON scheduled_emails(organization_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_created_by_time
  ON scheduled_emails(created_by, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_athlete_time
  ON scheduled_emails(athlete_id, scheduled_for DESC)
  WHERE athlete_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_scheduled_emails_updated_at ON scheduled_emails;
CREATE TRIGGER update_scheduled_emails_updated_at
  BEFORE UPDATE ON scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can view org scheduled emails"
  ON scheduled_emails FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

DROP POLICY IF EXISTS "Users can create own scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can create own scheduled emails"
  ON scheduled_emails FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND created_by = get_current_user_id()
  );

DROP POLICY IF EXISTS "Users can cancel own scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can cancel own scheduled emails"
  ON scheduled_emails FOR UPDATE TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND created_by = get_current_user_id()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND created_by = get_current_user_id()
  );

DROP POLICY IF EXISTS "Admins can manage org scheduled emails" ON scheduled_emails;
CREATE POLICY "Admins can manage org scheduled emails"
  ON scheduled_emails FOR ALL TO authenticated
  USING (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  )
  WITH CHECK (
    organization_id = get_current_organization_id()
    AND is_admin_like()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-attachments', 'email-attachments', false, 20971520)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 20971520;

DROP POLICY IF EXISTS "Users can read org email attachments" ON storage.objects;
CREATE POLICY "Users can read org email attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] = get_current_organization_id()::text
  );

DROP POLICY IF EXISTS "Users can upload org email attachments" ON storage.objects;
CREATE POLICY "Users can upload org email attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] = get_current_organization_id()::text
  );

DROP POLICY IF EXISTS "Users can delete own org email attachments" ON storage.objects;
CREATE POLICY "Users can delete own org email attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] = get_current_organization_id()::text
  );
