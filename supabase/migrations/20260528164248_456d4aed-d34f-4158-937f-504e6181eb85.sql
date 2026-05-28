-- 1) Drop le SELECT table-level (l'attribution de Supabase par défaut)
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- 2) Re-grant SELECT colonne par colonne, en excluant 'phone'.
GRANT SELECT (
  id, display_name, title, birthdate, created_at, updated_at, avatar_url,
  phone_visible, city, notify_email, notify_sms, notify_push, is_online,
  last_seen, suspended_until, suspension_reason, banned_at, ban_reason,
  verified, is_verified, is_suspended, is_banned, followers_count,
  notify_reservations, notify_messages, notify_followers, notify_admin,
  unsubscribed_all, warning_count, banned_by, charte_accepted,
  charte_accepted_at, charte_version, phone_verified
) ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT phone FROM public.profiles WHERE id = auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_phone(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone   text;
  v_visible boolean;
  v_caller  uuid := auth.uid();
BEGIN
  IF _user_id IS NULL OR v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT phone, phone_visible
    INTO v_phone, v_visible
    FROM public.profiles
   WHERE id = _user_id;

  IF v_phone IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller = _user_id THEN
    RETURN v_phone;
  END IF;

  IF internal.has_role(v_caller, 'admin'::app_role) THEN
    RETURN v_phone;
  END IF;

  IF v_visible THEN
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_phone(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_user_phone(uuid) TO authenticated;