
-- USER BADGES
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'emerald',
  awarded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, label)
);

GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT ALL ON public.user_badges TO service_role;
GRANT INSERT, DELETE ON public.user_badges TO authenticated;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by everyone" ON public.user_badges
  FOR SELECT USING (true);

CREATE POLICY "Admins manage badges insert" ON public.user_badges
  FOR INSERT TO authenticated
  WITH CHECK (internal.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage badges delete" ON public.user_badges
  FOR DELETE TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role));

-- NOTIFY ADMINS on new report
CREATE OR REPLACE FUNCTION public.notify_admins_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type, link)
  SELECT ur.user_id,
         'Nouveau signalement reçu : ' || NEW.raison,
         'admin_report',
         '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_report ON public.reports;
CREATE TRIGGER trg_notify_admins_on_report
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_report();

-- NOTIFY ADMINS on new contact message
CREATE OR REPLACE FUNCTION public.notify_admins_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type, link)
  SELECT ur.user_id,
         'Nouveau message admin de ' || NEW.name || ' : ' || NEW.subject,
         'admin_message',
         '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_contact ON public.contact_messages;
CREATE TRIGGER trg_notify_admins_on_contact
AFTER INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_contact();
