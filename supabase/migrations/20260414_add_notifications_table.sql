-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- recipient
  type TEXT NOT NULL, -- 'assignment', 'mention', 'contract', etc.
  title TEXT NOT NULL,
  message TEXT,
  href TEXT, -- link to relevant page
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- who triggered it
  entity_type TEXT, -- 'athlete', 'task', 'contract', etc.
  entity_id UUID, -- ID of the related entity
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user's notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Allow insert from server actions (service role)
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
