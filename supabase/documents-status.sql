-- Add status column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Update document_type to include more options
-- Existing types: contract, agreement, nil_deal, medical, academic, other
-- Adding: scouting_report
