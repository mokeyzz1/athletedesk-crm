-- Add secure RPC for staff self-assignment without broadening athlete UPDATE RLS

CREATE OR REPLACE FUNCTION self_assign_athlete(p_athlete_id UUID)
RETURNS athletes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_record users%ROWTYPE;
  target_athlete athletes%ROWTYPE;
  updated_athlete athletes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO current_user_record
  FROM users
  WHERE auth_user_id = auth.uid()::text
  LIMIT 1;

  IF NOT FOUND OR current_user_record.organization_id IS NULL THEN
    RAISE EXCEPTION 'User not found in database';
  END IF;

  IF current_user_record.role NOT IN ('scout', 'agent', 'marketing') THEN
    RAISE EXCEPTION 'Your role cannot self-assign athletes';
  END IF;

  SELECT * INTO target_athlete
  FROM athletes
  WHERE id = p_athlete_id
    AND organization_id = current_user_record.organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete not found or you do not have permission to assign them';
  END IF;

  IF current_user_record.role = 'scout' THEN
    IF target_athlete.assigned_scout_id IS NOT NULL
       AND target_athlete.assigned_scout_id <> current_user_record.id THEN
      RAISE EXCEPTION 'Scout is already assigned';
    END IF;

    UPDATE athletes
    SET assigned_scout_id = current_user_record.id,
        scout_ids = CASE
          WHEN COALESCE(scout_ids, '{}'::UUID[]) @> ARRAY[current_user_record.id]::UUID[] THEN scout_ids
          ELSE array_append(COALESCE(scout_ids, '{}'::UUID[]), current_user_record.id)
        END,
        updated_at = NOW()
    WHERE id = p_athlete_id
      AND organization_id = current_user_record.organization_id
    RETURNING * INTO updated_athlete;

  ELSIF current_user_record.role = 'agent' THEN
    IF target_athlete.assigned_agent_id IS NOT NULL
       AND target_athlete.assigned_agent_id <> current_user_record.id THEN
      RAISE EXCEPTION 'Agent is already assigned';
    END IF;

    UPDATE athletes
    SET assigned_agent_id = current_user_record.id,
        agent_ids = CASE
          WHEN COALESCE(agent_ids, '{}'::UUID[]) @> ARRAY[current_user_record.id]::UUID[] THEN agent_ids
          ELSE array_append(COALESCE(agent_ids, '{}'::UUID[]), current_user_record.id)
        END,
        updated_at = NOW()
    WHERE id = p_athlete_id
      AND organization_id = current_user_record.organization_id
    RETURNING * INTO updated_athlete;

  ELSIF current_user_record.role = 'marketing' THEN
    IF target_athlete.assigned_marketing_lead_id IS NOT NULL
       AND target_athlete.assigned_marketing_lead_id <> current_user_record.id THEN
      RAISE EXCEPTION 'Marketing Lead is already assigned';
    END IF;

    UPDATE athletes
    SET assigned_marketing_lead_id = current_user_record.id,
        marketing_ids = CASE
          WHEN COALESCE(marketing_ids, '{}'::UUID[]) @> ARRAY[current_user_record.id]::UUID[] THEN marketing_ids
          ELSE array_append(COALESCE(marketing_ids, '{}'::UUID[]), current_user_record.id)
        END,
        updated_at = NOW()
    WHERE id = p_athlete_id
      AND organization_id = current_user_record.organization_id
    RETURNING * INTO updated_athlete;
  END IF;

  RETURN updated_athlete;
END;
$$;

REVOKE ALL ON FUNCTION self_assign_athlete(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION self_assign_athlete(UUID) TO authenticated;
