-- AthleteDesk Sample Data
-- Based on real agency workflow
-- Run this in Supabase SQL Editor after running schema.sql

DO $$
DECLARE
  moses_id UUID;
  signed_athlete_id UUID;
BEGIN
  -- Get Moses Koroma's user ID (or first admin if not found)
  SELECT id INTO moses_id FROM users WHERE name ILIKE '%Moses%' OR name ILIKE '%Koroma%' LIMIT 1;
  IF moses_id IS NULL THEN
    SELECT id INTO moses_id FROM users WHERE role = 'admin' LIMIT 1;
  END IF;
  IF moses_id IS NULL THEN
    SELECT id INTO moses_id FROM users LIMIT 1;
  END IF;

  -- ============================================
  -- HIGH SCHOOL PROSPECTS (5)
  -- Class of 2027-2028, not committed, spread across regions
  -- ============================================

  -- HS 1: Northeast, Football, 2027, Not Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes)
  VALUES ('Jayden Marcus', 'jayden.marcus@gmail.com', '617-555-0123', 'St. Johns Prep (MA)', 'Football', 'Quarterback', 'high_school', '2027', 'Northeast', 'not_contacted', 'not_in_portal', 78, moses_id, 'Top QB in Massachusetts. Found via MaxPreps. Need to reach out via Instagram DM.');

  -- HS 2: Southeast, Basketball, 2027, Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('DeShawn Williams', 'deshawn.w2027@yahoo.com', '404-555-0456', 'Wheeler High School (GA)', 'Basketball', 'Point Guard', 'high_school', '2027', 'Southeast', 'contacted', 'not_in_portal', 82, moses_id, 'DM''d on Instagram last week. He responded asking for more info. Need to send agency deck.', CURRENT_DATE - 5);

  -- HS 3: Midwest, Football, 2028, Not Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes)
  VALUES ('Marcus Thompson Jr.', 'mthompsonjr@gmail.com', '312-555-0789', 'St. Rita (Chicago)', 'Football', 'Running Back', 'high_school', '2028', 'Midwest', 'not_contacted', 'not_in_portal', 75, moses_id, '4-star recruit. Dad played at Illinois. Found via recruiting service. High priority target.');

  -- HS 4: West, Basketball, 2027, Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Kevin Tran', 'kevintran.hoops@gmail.com', '714-555-0321', 'Mater Dei (CA)', 'Basketball', 'Shooting Guard', 'high_school', '2027', 'West', 'contacted', 'not_in_portal', 80, moses_id, 'Texted yesterday. Mom wants to schedule a Zoom call next week. Send calendar link.', CURRENT_DATE - 1);

  -- HS 5: Southwest, Football, 2028, Not Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes)
  VALUES ('Antonio Reyes', 'areyes2028@outlook.com', '214-555-0654', 'Allen High School (TX)', 'Football', 'Wide Receiver', 'high_school', '2028', 'Southwest', 'not_contacted', 'not_in_portal', 77, moses_id, 'Texas 6A state champion. Coach recommended reaching out. Get contact from coaching staff first.');

  -- ============================================
  -- D1 COLLEGE ATHLETES (5)
  -- Football and basketball, In Conversation and Interested
  -- ============================================

  -- D1 1: Southeast, Football, 2025, In Conversation
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Terrance Mitchell', 'tmitchell@uga.edu', '706-555-0111', 'University of Georgia', 'Football', 'Linebacker', 'college', '2025', 'Southeast', 'in_conversation', 'not_in_portal', 85, moses_id, 'Had Zoom call last Tuesday. Interested in revenue share deal. Wants to talk to parents first. Follow up Friday.', CURRENT_DATE - 4);

  -- D1 2: Midwest, Basketball, 2026, Interested
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Jordan Hayes', 'jhayes.hoops@osu.edu', '614-555-0222', 'Ohio State', 'Basketball', 'Power Forward', 'college', '2026', 'Midwest', 'interested', 'not_in_portal', 88, moses_id, 'Very interested! Booked call with him and his dad for Monday. Prepare revenue share proposal for Big Ten athlete.', CURRENT_DATE - 2);

  -- D1 3: West, Football, 2025, In Conversation
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Brandon Nakamura', 'bnakamura@usc.edu', '213-555-0333', 'USC', 'Football', 'Safety', 'college', '2025', 'West', 'in_conversation', 'not_in_portal', 83, moses_id, 'Met at USC campus visit. Exchanged numbers. He texted asking about timeline. Set up intro call.', CURRENT_DATE - 7);

  -- D1 4: Northeast, Basketball, 2025, Interested
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Michael Chen', 'mchen.ball@uconn.edu', '860-555-0444', 'UConn', 'Basketball', 'Point Guard', 'college', '2025', 'Northeast', 'interested', 'not_in_portal', 86, moses_id, 'Strong interest. His AAU coach connected us. Sending contract draft this week. High priority closer.', CURRENT_DATE - 3);

  -- D1 5: Southeast, Football, 2026, In Conversation
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Darius Washington', 'dwashington@clemson.edu', '864-555-0555', 'Clemson', 'Football', 'Cornerback', 'college', '2026', 'Southeast', 'in_conversation', 'not_in_portal', 81, moses_id, 'Initial call went well. He has questions about NIL regulations at Clemson. Research and send FAQ doc.', CURRENT_DATE - 6);

  -- ============================================
  -- D2 ATHLETES FOR SCHOLARSHIP NEGOTIATION (4)
  -- Mix of sports, Contacted and In Conversation
  -- ============================================

  -- D2 1: Southwest, Soccer, 2025, Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Sofia Martinez', 'smartinez@utpb.edu', '432-555-0666', 'UT Permian Basin', 'Soccer', 'Forward', 'college', '2025', 'Southwest', 'contacted', 'not_in_portal', 68, moses_id, 'Wants help negotiating better scholarship. Current deal is 50%. Email sent with questionnaire. Waiting for response.', CURRENT_DATE - 8);

  -- D2 2: Midwest, Baseball, 2026, In Conversation
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Tyler Brooks', 'tbrooks.baseball@quincy.edu', '217-555-0777', 'Quincy University', 'Baseball', 'Pitcher', 'college', '2026', 'Midwest', 'in_conversation', 'not_in_portal', 65, moses_id, 'Only getting 40% scholarship. We can help get to 75%+. Call with coach scheduled for Thursday.', CURRENT_DATE - 3);

  -- D2 3: Northeast, Volleyball, 2025, Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Emma Richardson', 'erichardson@bentley.edu', '781-555-0888', 'Bentley University', 'Volleyball', 'Outside Hitter', 'college', '2025', 'Northeast', 'contacted', 'not_in_portal', 70, moses_id, 'Referred by another client. Scholarship is 30%. DM''d on Instagram, she replied interested. Schedule call.', CURRENT_DATE - 4);

  -- D2 4: West, Track & Field, 2026, In Conversation
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Isaiah Green', 'igreen.track@csusm.edu', '760-555-0999', 'Cal State San Marcos', 'Track & Field', 'Sprinter', 'college', '2026', 'West', 'in_conversation', 'not_in_portal', 72, moses_id, 'Currently walk-on, wants scholarship. Had intro call. Pulling his times to present to coaching staff.', CURRENT_DATE - 5);

  -- ============================================
  -- TRANSFER PORTAL ATHLETES (3)
  -- Football and basketball
  -- ============================================

  -- Portal 1: Midwest, Football, 2025, Interested
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Jamal Carter', 'jcarter.portal@gmail.com', '313-555-1111', 'Michigan (transferring)', 'Football', 'Running Back', 'college', '2025', 'Midwest', 'interested', 'entered_portal', 84, moses_id, 'In portal as of last week. Multiple SEC schools interested. He wants agent before deciding. Hot lead!', CURRENT_DATE - 2);

  -- Portal 2: Southeast, Basketball, 2025, In Conversation
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Kendrick Thomas', 'kthomas.transfer@gmail.com', '901-555-2222', 'Memphis (transferring)', 'Basketball', 'Small Forward', 'college', '2025', 'Southeast', 'in_conversation', 'entered_portal', 79, moses_id, 'Entered portal yesterday. Had quick call today. Wants to sign with us before committing to new school. Send agreement.', CURRENT_DATE - 1);

  -- Portal 3: West, Football, 2026, Contacted
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Ryan Okonkwo', 'rokonkwo@gmail.com', '503-555-3333', 'Oregon State (transferring)', 'Football', 'Defensive End', 'college', '2026', 'West', 'contacted', 'entered_portal', 76, moses_id, 'Just entered portal. Reached out via text, waiting for response. Pac-12 experience valuable.', CURRENT_DATE - 3);

  -- ============================================
  -- NIL ACTIVE ATHLETES (2)
  -- Already have NIL deals but no agent
  -- ============================================

  -- NIL 1: Southeast, Football, 2025, Interested
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Cameron Davis', 'cdavis.nil@lsu.edu', '225-555-4444', 'LSU', 'Football', 'Wide Receiver', 'college', '2025', 'Southeast', 'interested', 'not_in_portal', 91, moses_id, 'Has 150K Instagram followers. Already doing local car dealership deals on his own. Wants professional management. Very interested in signing.', CURRENT_DATE - 2);

  -- NIL 2: Southwest, Basketball, 2025, Interested
  INSERT INTO athletes (name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_scout_id, notes, last_contacted_date)
  VALUES ('Aaliyah Johnson', 'ajohnson.nil@texas.edu', '512-555-5555', 'Texas', 'Basketball', 'Guard', 'college', '2025', 'Southwest', 'interested', 'not_in_portal', 89, moses_id, 'Women''s basketball rising star. Has Gatorade deal she negotiated herself. Wants help with bigger brands. Meeting scheduled for next week.', CURRENT_DATE - 4);

  -- ============================================
  -- SIGNED CLIENT (1)
  -- On the Roster with Revenue Share + Marketing deals
  -- ============================================

  INSERT INTO athletes (id, name, email, phone, school, sport, position, league_level, class_year, region, outreach_status, transfer_portal_status, marketability_score, assigned_agent_id, assigned_marketing_lead_id, notes)
  VALUES (uuid_generate_v4(), 'Marcus Williams', 'mwilliams.pro@gmail.com', '205-555-6666', 'Alabama', 'Football', 'Quarterback', 'college', '2025', 'Southeast', 'signed', 'not_in_portal', 94, moses_id, moses_id, 'Signed client since January. Revenue share deal with Alabama athletics. Nike marketing deal in progress. Our first big signing!')
  RETURNING id INTO signed_athlete_id;

  -- Add financial tracking for signed client (ACTIVE deals - real executed deals)
  -- Revenue Share deal
  INSERT INTO financial_tracking (athlete_id, deal_name, deal_value, agency_percentage, payment_status, deal_date, invoice_date, payment_date, notes, deal_type, deal_stage)
  VALUES (signed_athlete_id, 'Alabama Athletics Revenue Share Q1', 75000, 10, 'paid', CURRENT_DATE - 60, CURRENT_DATE - 58, CURRENT_DATE - 45, 'First quarterly payment from revenue share agreement', 'revenue_share', 'active');

  -- Marketing deal
  INSERT INTO financial_tracking (athlete_id, deal_name, deal_value, agency_percentage, payment_status, deal_date, invoice_date, notes, deal_type, deal_stage)
  VALUES (signed_athlete_id, 'Nike Regional Ambassador', 45000, 15, 'invoiced', CURRENT_DATE - 30, CURRENT_DATE - 28, 'Nike Southeast regional campaign. Awaiting payment.', 'marketing_brand', 'active');

  -- Add brand outreach for the signed client (ACTIVE deals)
  INSERT INTO brand_outreach (brand_name, brand_contact_name, brand_contact_email, staff_member_id, athlete_id, date_contacted, outreach_method, response_status, deal_value, product_value, campaign_details, notes, deal_stage)
  VALUES
    ('Nike', 'Sarah Chen', 'schen@nike.com', moses_id, signed_athlete_id, CURRENT_DATE - 45, 'email', 'deal_closed', 45000, 5000, 'Southeast Regional Ambassador', 'Signed and announced', 'active'),
    ('Beats by Dre', 'James Wilson', 'jwilson@beats.com', moses_id, signed_athlete_id, CURRENT_DATE - 14, 'email', 'in_discussion', 25000, 3000, 'College athlete campaign', 'Negotiating terms, looks promising', 'active');

  -- ============================================
  -- PROSPECTIVE DEALS (to show value during recruiting pitches)
  -- These are deals we can offer to prospects when recruiting them
  -- ============================================

  -- Add prospective deals for Cameron Davis (NIL athlete we're trying to sign)
  INSERT INTO brand_outreach (brand_name, brand_contact_name, brand_contact_email, staff_member_id, athlete_id, date_contacted, outreach_method, response_status, deal_value, product_value, campaign_details, notes, deal_stage)
  SELECT 'Champs Sports', 'Mike Rodriguez', 'mrodriguez@champs.com', moses_id, id, CURRENT_DATE - 10, 'email', 'interested', 20000, 2500, 'Regional NIL campaign', 'We have this deal ready for him if he signs with us', 'prospective'
  FROM athletes WHERE name = 'Cameron Davis';

  -- Add prospective deals for Jordan Hayes (D1 basketball, very interested)
  INSERT INTO brand_outreach (brand_name, brand_contact_name, brand_contact_email, staff_member_id, athlete_id, date_contacted, outreach_method, response_status, deal_value, product_value, campaign_details, notes, deal_stage)
  SELECT 'Fanatics', 'Lisa Park', 'lpark@fanatics.com', moses_id, id, CURRENT_DATE - 5, 'linkedin', 'interested', 15000, 1000, 'Big Ten NIL collective partnership', 'Deal contingent on athlete signing with our agency', 'prospective'
  FROM athletes WHERE name = 'Jordan Hayes';

  INSERT INTO financial_tracking (athlete_id, deal_name, deal_value, agency_percentage, payment_status, deal_date, notes, deal_type, deal_stage)
  SELECT id, 'Ohio State NIL Collective Revenue Share', 35000, 12, 'pending', CURRENT_DATE - 3, 'Pending deal to pitch during Monday call with Jordan and his dad', 'revenue_share', 'prospective'
  FROM athletes WHERE name = 'Jordan Hayes';

  -- Add some communications for the signed client
  INSERT INTO communications_log (athlete_id, staff_member_id, communication_date, type, subject, notes, follow_up_date, follow_up_completed)
  VALUES
    (signed_athlete_id, moses_id, NOW() - INTERVAL '7 days', 'zoom', 'Weekly Check-in', 'Discussed Nike campaign launch. He is excited about the exposure.', CURRENT_DATE + 7, false),
    (signed_athlete_id, moses_id, NOW() - INTERVAL '14 days', 'call', 'Beats Deal Discussion', 'Reviewed Beats offer. He wants to counter at $30K. Will relay to brand.', NULL, true);

END $$;
