CREATE OR REPLACE FUNCTION public.email_throttle_try_log(
  _user_id     uuid,
  _email_type  text,
  _context_id  text DEFAULT NULL,
  _per_context_window_minutes int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_count int;
  v_ctx_count   int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text));

  SELECT count(*) INTO v_daily_count
    FROM public.email_throttle
   WHERE user_id = _user_id
     AND sent_at >= now() - interval '24 hours';
  IF v_daily_count >= 5 THEN
    RETURN false;
  END IF;

  IF _context_id IS NOT NULL AND _per_context_window_minutes IS NOT NULL THEN
    SELECT count(*) INTO v_ctx_count
      FROM public.email_throttle
     WHERE user_id    = _user_id
       AND email_type = _email_type
       AND context_id = _context_id
       AND sent_at    >= now() - make_interval(mins => _per_context_window_minutes);
    IF v_ctx_count >= 1 THEN
      RETURN false;
    END IF;
  END IF;

  INSERT INTO public.email_throttle (user_id, email_type, context_id)
       VALUES (_user_id, _email_type, _context_id);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.email_throttle_try_log(uuid, text, text, int)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_throttle_try_log(uuid, text, text, int)
  TO service_role;