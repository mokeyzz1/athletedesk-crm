-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_shared ON email_templates(is_shared);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policies: Users can see their own templates and shared templates
CREATE POLICY "Users can view their own templates" ON email_templates
  FOR SELECT
  USING (created_by = get_current_user_id() OR is_shared = true);

CREATE POLICY "Users can insert their own templates" ON email_templates
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own templates" ON email_templates
  FOR UPDATE
  USING (created_by = get_current_user_id());

CREATE POLICY "Users can delete their own templates" ON email_templates
  FOR DELETE
  USING (created_by = get_current_user_id());

-- Admins can do everything
CREATE POLICY "Admins have full access to templates" ON email_templates
  FOR ALL
  USING (get_user_role() = 'admin');

-- Grant permissions
GRANT ALL ON email_templates TO authenticated;
