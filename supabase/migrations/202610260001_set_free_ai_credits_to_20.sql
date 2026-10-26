-- Give free student accounts 20 successful AI questions per rolling 24-hour window.
-- Premium entitlement is still derived from verified subscription rows.
CREATE OR REPLACE FUNCTION public.reserve_study_ai_request(target_user uuid, request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_row public.profiles%rowtype;
  premium_active boolean;
  next_count integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Server access required' USING errcode = '42501';
  END IF;
  IF target_user IS NULL OR request_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request' USING errcode = '22023';
  END IF;

  DELETE FROM public.study_ai_usage_reservations
   WHERE id IN (
     SELECT id FROM public.study_ai_usage_reservations
      WHERE status <> 'reserved' AND created_at < now() - interval '30 days'
      ORDER BY created_at LIMIT 500
   );

  SELECT * INTO profile_row FROM public.profiles WHERE id = target_user FOR UPDATE;
  IF profile_row.id IS NULL THEN
    RAISE EXCEPTION 'Study profile not found' USING errcode = 'P0002';
  END IF;
  IF EXISTS(SELECT 1 FROM public.study_ai_usage_reservations WHERE id = request_id) THEN
    RAISE EXCEPTION 'Request already reserved' USING errcode = '23505';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
     WHERE s.user_id = target_user
       AND (s.status = 'active' OR (s.status = 'cancelled' AND s.current_period_end > now()))
  ) INTO premium_active;

  IF profile_row.last_reset <= now() - interval '24 hours' THEN
    UPDATE public.profiles SET daily_tokens = 0, last_reset = now()
     WHERE id = target_user RETURNING * INTO profile_row;
  END IF;

  IF NOT premium_active AND profile_row.daily_tokens >= 20 THEN
    RETURN jsonb_build_object('allowed', false, 'premium', false, 'used', profile_row.daily_tokens, 'limit', 20);
  END IF;

  next_count := profile_row.daily_tokens;
  IF NOT premium_active THEN
    next_count := profile_row.daily_tokens + 1;
    UPDATE public.profiles SET daily_tokens = next_count WHERE id = target_user;
  END IF;

  INSERT INTO public.study_ai_usage_reservations(id, user_id, quota_window, counted_toward_free_limit, status)
  VALUES (request_id, target_user, profile_row.last_reset, NOT premium_active, 'reserved');

  RETURN jsonb_build_object('allowed', true, 'premium', premium_active, 'used', next_count, 'limit', 20);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_study_ai_request(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_study_ai_request(uuid, uuid) TO service_role;
