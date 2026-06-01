
-- Helper: count donations created by a user in the current calendar month
CREATE OR REPLACE FUNCTION public.count_user_donations_this_month(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.books
  WHERE seller_id = _user_id
    AND is_donation = true
    AND created_at >= date_trunc('month', now());
$$;

-- Helper: count reservation requests created by a user in the current calendar month
CREATE OR REPLACE FUNCTION public.count_user_requests_this_month(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.book_requests
  WHERE requester_id = _user_id
    AND created_at >= date_trunc('month', now());
$$;

-- Restrictive policy: max 3 donations per month
DROP POLICY IF EXISTS "Max 3 donations per month" ON public.books;
CREATE POLICY "Max 3 donations per month"
ON public.books
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  is_donation = false
  OR public.count_user_donations_this_month(auth.uid()) < 3
);

-- Restrictive policy: max 2 reservation requests per month
DROP POLICY IF EXISTS "Max 2 requests per month" ON public.book_requests;
CREATE POLICY "Max 2 requests per month"
ON public.book_requests
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.count_user_requests_this_month(auth.uid()) < 2
);
