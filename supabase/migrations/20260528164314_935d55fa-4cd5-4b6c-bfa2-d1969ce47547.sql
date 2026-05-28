CREATE TABLE IF NOT EXISTS public.moderation_keywords (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_keywords TO authenticated;
GRANT ALL ON public.moderation_keywords TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_moderation_keywords_lower
  ON public.moderation_keywords (lower(keyword));

ALTER TABLE public.moderation_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated reads keywords" ON public.moderation_keywords;
CREATE POLICY "Anyone authenticated reads keywords"
  ON public.moderation_keywords FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage keywords" ON public.moderation_keywords;
CREATE POLICY "Admins manage keywords"
  ON public.moderation_keywords FOR ALL TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (internal.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.moderation_keywords (keyword) VALUES
  ('alcool'), ('vin'), ('biere'), ('bière'), ('porc'), ('jambon'),
  ('tarot'), ('horoscope'), ('astrologie'), ('magie noire'), ('sorcellerie'),
  ('nudite'), ('nudité'), ('erotique'), ('érotique'), ('pornographie'), ('porno'),
  ('kafir'), ('kufr'), ('takfir'), ('mécréant traître'), ('mort aux'),
  ('haine'), ('raciste'), ('racisme'), ('nazi'),
  ('secte'), ('khawarij maudit'), ('rafidite chien'),
  ('arnaque'), ('ponzi'), ('crypto pump'), ('investissement garanti'),
  ('viagra'), ('cialis'), ('casino'), ('paris sportifs'), ('loterie'),
  ('contactez whatsapp +'), ('telegram t.me/')
ON CONFLICT (lower(keyword)) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_forbidden_text(_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_haystack text;
  v_kw       text;
BEGIN
  IF _text IS NULL OR length(trim(_text)) = 0 THEN
    RETURN NULL;
  END IF;
  v_haystack := lower(_text);
  FOR v_kw IN SELECT lower(keyword) FROM public.moderation_keywords LOOP
    IF position(v_kw IN v_haystack) > 0 THEN
      RETURN v_kw;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_forbidden_text(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.books_moderate_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offending text;
BEGIN
  v_offending := public.check_forbidden_text(
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
  );
  IF v_offending IS NOT NULL THEN
    RAISE EXCEPTION 'Contenu interdit détecté: %', v_offending
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_books_moderate ON public.books;
CREATE TRIGGER trg_books_moderate
  BEFORE INSERT OR UPDATE OF title, description
  ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.books_moderate_trigger();