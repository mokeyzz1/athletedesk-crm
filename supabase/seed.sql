-- AthleteDesk Sample Data
-- Run this in Supabase SQL Editor after running schema.sql

DO $$
DECLARE
  admin_id UUID;
  athlete1_id UUID;
  athlete2_id UUID;
  athlete3_id UUID;
  athlete4_id UUID;
  athlete5_id UUID;
  athlete6_id UUID;
BEGIN
  -- Get the first user (your admin account)
  SELECT id INTO admin_id FROM users LIMIT 1;

  -- Insert sample athletes
  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, eligibility_year, recruiting_status, transfer_portal_status, marketability_score, sport_specific_stats, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES
    (uuid_generate_v4(), 'Marcus Johnson', 'marcus.j@email.com', '555-0101', 'Duke University', 'Basketball', 'Point Guard', 'college', 2025, 'actively_recruiting', 'not_in_portal', 85, '{"ppg": 18.5, "apg": 7.2, "spg": 2.1, "fg_pct": 45.2}', admin_id, admin_id, admin_id, 'Elite court vision, potential lottery pick')
  RETURNING id INTO athlete1_id;

  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, eligibility_year, recruiting_status, transfer_portal_status, marketability_score, sport_specific_stats, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES
    (uuid_generate_v4(), 'Jaylen Williams', 'jwilliams@email.com', '555-0102', 'Alabama', 'Football', 'Wide Receiver', 'college', 2025, 'open_to_contact', 'entered_portal', 72, '{"receptions": 68, "yards": 1150, "touchdowns": 9, "ypc": 16.9}', admin_id, admin_id, admin_id, 'Speed demon, great route runner')
  RETURNING id INTO athlete2_id;

  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, eligibility_year, recruiting_status, transfer_portal_status, marketability_score, sport_specific_stats, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES
    (uuid_generate_v4(), 'Sofia Rodriguez', 'sofia.r@email.com', '555-0103', 'Stanford', 'Soccer', 'Forward', 'college', 2026, 'actively_recruiting', 'not_in_portal', 78, '{"goals": 15, "assists": 8, "shots_on_target": 42}', admin_id, admin_id, admin_id, 'Technical player, strong social media presence')
  RETURNING id INTO athlete3_id;

  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, eligibility_year, recruiting_status, transfer_portal_status, marketability_score, sport_specific_stats, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES
    (uuid_generate_v4(), 'Derek Thompson', 'dthompson@email.com', '555-0104', 'IMG Academy', 'Basketball', 'Small Forward', 'high_school', 2026, 'open_to_contact', 'not_in_portal', 91, '{"ppg": 24.3, "rpg": 8.1, "apg": 3.5}', admin_id, admin_id, admin_id, 'Top 10 recruit nationally, massive NIL potential')
  RETURNING id INTO athlete4_id;

  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, eligibility_year, recruiting_status, transfer_portal_status, marketability_score, sport_specific_stats, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES
    (uuid_generate_v4(), 'Aisha Patel', 'aisha.p@email.com', '555-0105', 'UCLA', 'Tennis', 'Singles', 'college', 2025, 'signed', 'not_in_portal', 82, '{"ranking": 45, "win_pct": 78.5, "aces_per_match": 6.2}', admin_id, admin_id, admin_id, 'Rising star, brand-friendly personality')
  RETURNING id INTO athlete5_id;

  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, eligibility_year, recruiting_status, transfer_portal_status, marketability_score, sport_specific_stats, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES
    (uuid_generate_v4(), 'Tyler Brooks', 'tbrooks@email.com', '555-0106', 'Ohio State', 'Football', 'Quarterback', 'college', 2025, 'committed', 'not_in_portal', 88, '{"passing_yards": 3200, "touchdowns": 28, "completion_pct": 67.5, "qbr": 84.2}', admin_id, admin_id, admin_id, 'Strong arm, leader on and off field')
  RETURNING id INTO athlete6_id;

  -- Insert pipeline entries
  INSERT INTO recruiting_pipeline (athlete_id, pipeline_stage, priority, last_contact_date, next_action, notes)
  VALUES
    (athlete1_id, 'signing_in_progress', 'high', CURRENT_DATE - 2, 'Review contract terms', 'Agent meeting scheduled for Friday'),
    (athlete2_id, 'interested', 'high', CURRENT_DATE - 5, 'Follow up on portal decision', 'Waiting on final transfer destination'),
    (athlete3_id, 'recruiting_conversation', 'medium', CURRENT_DATE - 7, 'Send NIL proposal', 'Very interested in brand partnerships'),
    (athlete4_id, 'scout_evaluation', 'high', CURRENT_DATE - 1, 'Attend next game', 'Must see in person before proceeding'),
    (athlete5_id, 'signed_client', 'medium', CURRENT_DATE - 30, 'Quarterly check-in', 'Happy client, looking for more deals'),
    (athlete6_id, 'initial_contact', 'medium', CURRENT_DATE - 3, 'Schedule intro call', 'Reached out via DM');

  -- Insert communications
  INSERT INTO communications_log (athlete_id, staff_member_id, communication_date, type, subject, notes, follow_up_date, follow_up_completed)
  VALUES
    (athlete1_id, admin_id, NOW() - INTERVAL '2 days', 'zoom', 'Contract Discussion', 'Reviewed terms, athlete wants higher guarantee', CURRENT_DATE + 3, false),
    (athlete1_id, admin_id, NOW() - INTERVAL '7 days', 'call', 'Initial Offer', 'Presented agency services and fee structure', NULL, true),
    (athlete2_id, admin_id, NOW() - INTERVAL '5 days', 'text', 'Portal Update', 'Asked about timeline for decision', CURRENT_DATE + 2, false),
    (athlete3_id, admin_id, NOW() - INTERVAL '7 days', 'email', 'NIL Opportunities', 'Sent overview of potential brand partners', CURRENT_DATE + 5, false),
    (athlete4_id, admin_id, NOW() - INTERVAL '1 day', 'call', 'Introduction', 'Spoke with athlete and parents, very receptive', CURRENT_DATE + 7, false),
    (athlete5_id, admin_id, NOW() - INTERVAL '14 days', 'zoom', 'Quarterly Review', 'Reviewed deals, discussed upcoming opportunities', NULL, true);

  -- Insert brand outreach
  INSERT INTO brand_outreach (brand_name, brand_contact_name, brand_contact_email, staff_member_id, athlete_id, date_contacted, outreach_method, response_status, follow_up_date, deal_value, product_value, campaign_details, notes)
  VALUES
    ('Nike', 'Sarah Chen', 'schen@nike.com', admin_id, athlete1_id, CURRENT_DATE - 10, 'email', 'in_discussion', CURRENT_DATE + 5, 150000, 25000, 'Signature shoe campaign', 'Very interested, negotiating terms'),
    ('Gatorade', 'Mike Thompson', 'mthompson@gatorade.com', admin_id, athlete1_id, CURRENT_DATE - 14, 'linkedin', 'interested', CURRENT_DATE + 3, 75000, 10000, 'Social media campaign', 'Wants to see engagement metrics'),
    ('Under Armour', 'Lisa Park', 'lpark@ua.com', admin_id, athlete4_id, CURRENT_DATE - 5, 'email', 'in_discussion', CURRENT_DATE + 7, 200000, 50000, 'Multi-year NIL deal', 'High priority prospect for them'),
    ('Beats by Dre', 'James Wilson', 'jwilson@beats.com', admin_id, athlete5_id, CURRENT_DATE - 20, 'event', 'deal_closed', NULL, 35000, 5000, 'Product endorsement', 'Signed and announced'),
    ('Chipotle', 'Emma Davis', 'edavis@chipotle.com', admin_id, athlete6_id, CURRENT_DATE - 8, 'email', 'no_response', CURRENT_DATE + 2, NULL, NULL, 'NIL partnership', 'Following up this week'),
    ('Adidas', 'Carlos Martinez', 'cmartinez@adidas.com', admin_id, athlete3_id, CURRENT_DATE - 12, 'phone', 'interested', CURRENT_DATE + 4, 45000, 15000, 'Soccer cleat campaign', 'Good fit for their soccer line');

  -- Insert financial records
  INSERT INTO financial_tracking (athlete_id, deal_name, deal_value, agency_percentage, payment_status, deal_date, invoice_date, payment_date, notes)
  VALUES
    (athlete5_id, 'Beats by Dre Endorsement', 35000, 15, 'paid', CURRENT_DATE - 20, CURRENT_DATE - 18, CURRENT_DATE - 5, 'First deal for this client'),
    (athlete5_id, 'Local Car Dealership Ad', 8000, 15, 'invoiced', CURRENT_DATE - 45, CURRENT_DATE - 40, NULL, 'TV commercial spot'),
    (athlete1_id, 'Sneaker Store Appearance', 5000, 15, 'pending', CURRENT_DATE - 3, NULL, NULL, 'Meet and greet event'),
    (athlete4_id, 'Sports Drink Social Post', 12000, 20, 'paid', CURRENT_DATE - 60, CURRENT_DATE - 58, CURRENT_DATE - 30, 'Instagram campaign');

END $$;
