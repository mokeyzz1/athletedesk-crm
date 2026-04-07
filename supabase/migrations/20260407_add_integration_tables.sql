-- Integration tables for Google Calendar, Calendly, DocuSign, and Apollo

-- Calendar events (Google Calendar + Calendly)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  external_id TEXT, -- Google Calendar event ID or Calendly event URI
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'calendly')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  meeting_url TEXT,
  attendees JSONB DEFAULT '[]',
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'tentative')),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, external_id)
);

-- DocuSign contracts/envelopes
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  sent_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  envelope_id TEXT, -- DocuSign envelope ID
  title TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('created', 'sent', 'delivered', 'signed', 'declined', 'voided')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Link to signed doc when completed
  metadata JSONB DEFAULT '{}', -- Store template info, signer details, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apollo contact enrichment cache
CREATE TABLE IF NOT EXISTS apollo_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  company_name TEXT,
  company_domain TEXT,
  linkedin_url TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  verified_email BOOLEAN DEFAULT false,
  enriched_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB DEFAULT '{}', -- Full Apollo response
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_athlete ON calendar_events(athlete_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_provider ON calendar_events(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON calendar_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_contracts_athlete ON contracts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_envelope ON contracts(envelope_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);

CREATE INDEX IF NOT EXISTS idx_apollo_contacts_email ON apollo_contacts(email);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_company ON apollo_contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_org ON apollo_contacts(organization_id);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apollo_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view own org calendar events" ON calendar_events
  FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

CREATE POLICY "Users can insert own calendar events" ON calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_current_user_id() AND organization_id = get_current_organization_id());

CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE TO authenticated
  USING (user_id = get_current_user_id());

-- RLS Policies for contracts
CREATE POLICY "Users can view own org contracts" ON contracts
  FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

CREATE POLICY "Users can insert contracts" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (sent_by_user_id = get_current_user_id() AND organization_id = get_current_organization_id());

CREATE POLICY "Users can update own contracts" ON contracts
  FOR UPDATE TO authenticated
  USING (sent_by_user_id = get_current_user_id() OR
         EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND role = 'admin'))
  WITH CHECK (organization_id = get_current_organization_id());

-- RLS Policies for apollo_contacts
CREATE POLICY "Users can view own org apollo contacts" ON apollo_contacts
  FOR SELECT TO authenticated
  USING (organization_id = get_current_organization_id());

CREATE POLICY "Users can insert apollo contacts" ON apollo_contacts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_current_organization_id());

CREATE POLICY "Users can update own org apollo contacts" ON apollo_contacts
  FOR UPDATE TO authenticated
  USING (organization_id = get_current_organization_id())
  WITH CHECK (organization_id = get_current_organization_id());

-- Trigger to auto-set organization_id from user
CREATE OR REPLACE FUNCTION set_calendar_event_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_calendar_event_org_trigger
  BEFORE INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_calendar_event_org_id();

CREATE OR REPLACE FUNCTION set_contract_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM users WHERE id = NEW.sent_by_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_contract_org_trigger
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_org_id();

-- Updated_at triggers
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apollo_contacts_updated_at
  BEFORE UPDATE ON apollo_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
