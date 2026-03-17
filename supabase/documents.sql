-- Documents table for contract and file storage
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  document_type VARCHAR(50) DEFAULT 'other',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster athlete document lookups
CREATE INDEX IF NOT EXISTS idx_documents_athlete_id ON documents(athlete_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view documents"
  ON documents FOR SELECT
  USING (true);

CREATE POLICY "Users can insert documents"
  ON documents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update documents"
  ON documents FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete documents"
  ON documents FOR DELETE
  USING (true);

-- Create storage bucket for documents (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
