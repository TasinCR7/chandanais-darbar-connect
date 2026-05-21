-- 1. Helper function to check if the user is staff (admin or treasurer)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'treasurer');
END;
$$;

-- 2. Enable RLS on all related tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_topics ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Staff manage members" ON public.members;
DROP POLICY IF EXISTS "Public select members blocked" ON public.members;
DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff manage monthly_targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Staff manage app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public select app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public insert donations" ON public.donations;
DROP POLICY IF EXISTS "Staff manage donations" ON public.donations;
DROP POLICY IF EXISTS "Public read notices" ON public.notices;
DROP POLICY IF EXISTS "Staff manage notices" ON public.notices;
DROP POLICY IF EXISTS "Public read gallery" ON public.gallery;
DROP POLICY IF EXISTS "Staff manage gallery" ON public.gallery;
DROP POLICY IF EXISTS "Public read committee_members" ON public.committee_members;
DROP POLICY IF EXISTS "Staff manage committee_members" ON public.committee_members;

-- 4. Define policies for staff (Full Access) and public (Strictly Blocked / Controlled)

-- members: Staff can do everything; public cannot select/insert/update/delete directly
CREATE POLICY "Staff manage members" ON public.members
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- payments: Staff can do everything; public cannot select/insert/update/delete directly
CREATE POLICY "Staff manage payments" ON public.payments
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- expenses: Staff can do everything; public cannot select/insert/update/delete directly
CREATE POLICY "Staff manage expenses" ON public.expenses
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- monthly_targets: Staff can do everything; public cannot select/insert/update/delete directly
CREATE POLICY "Staff manage monthly_targets" ON public.monthly_targets
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- app_settings: Staff can manage; public can only SELECT settings
CREATE POLICY "Staff manage app_settings" ON public.app_settings
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public read app_settings" ON public.app_settings
    FOR SELECT TO public USING (true);

-- donations: Staff can manage; public can insert donations
CREATE POLICY "Staff manage donations" ON public.donations
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public insert donations" ON public.donations
    FOR INSERT TO public WITH CHECK (true);

-- gallery: Staff can manage; public can read
CREATE POLICY "Staff manage gallery" ON public.gallery
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public read gallery" ON public.gallery
    FOR SELECT TO public USING (true);

-- notices: Staff can manage; public can read
CREATE POLICY "Staff manage notices" ON public.notices
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public read notices" ON public.notices
    FOR SELECT TO public USING (true);

-- committee_members: Staff can manage; public can read
CREATE POLICY "Staff manage committee_members" ON public.committee_members
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public read committee_members" ON public.committee_members
    FOR SELECT TO public USING (true);

-- vote_topics: Staff can manage; public cannot do anything
CREATE POLICY "Staff manage vote_topics" ON public.vote_topics
    FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


-- 5. Secure RPC Functions (SECURITY DEFINER) to bypass RLS safely for specific tasks

-- search_member: search a member by code or phone number. Mask phone number if searching by code for privacy.
CREATE OR REPLACE FUNCTION public.search_member(p_code text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    member_code text,
    full_name text,
    phone text,
    joined_date date,
    monthly_rate numeric,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.member_code, 
    m.full_name,
    CASE 
      WHEN p_phone IS NOT NULL OR public.is_staff(auth.uid()) THEN m.phone
      ELSE 
        CASE 
          WHEN length(m.phone) >= 11 THEN substring(m.phone from 1 for 3) || '*****' || substring(m.phone from length(m.phone)-2)
          ELSE '*****'
        END
    END AS phone,
    m.joined_date::date, 
    m.monthly_rate::numeric, 
    m.is_active
  FROM public.members m
  WHERE (p_code IS NOT NULL AND m.member_code ILIKE p_code)
     OR (p_phone IS NOT NULL AND m.phone = p_phone);
END;
$$;

-- get_member_payments: get payments for a specific member
CREATE OR REPLACE FUNCTION public.get_member_payments(p_member_id uuid)
RETURNS TABLE (
    id uuid,
    amount numeric,
    for_year int,
    for_month int,
    payment_date date,
    method text,
    transaction_ref text,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.amount::numeric, 
    p.for_year::int, 
    p.for_month::int, 
    p.payment_date::date, 
    p.method::text, 
    p.transaction_ref::text,
    p.status::text
  FROM public.payments p
  WHERE p.member_id = p_member_id
  ORDER BY p.for_year DESC, p.for_month DESC;
END;
$$;

-- submit_member_payment: submit a pending payment for review
CREATE OR REPLACE FUNCTION public.submit_member_payment(
    p_member_id uuid,
    p_amount numeric,
    p_for_year int,
    p_for_month int,
    p_payment_date date,
    p_method text,
    p_transaction_ref text DEFAULT NULL,
    p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id uuid;
BEGIN
    INSERT INTO public.payments (
        member_id,
        amount,
        for_year,
        for_month,
        payment_date,
        method,
        transaction_ref,
        note,
        status
    ) VALUES (
        p_member_id,
        p_amount,
        p_for_year,
        p_for_month,
        p_payment_date,
        p_method,
        p_transaction_ref,
        p_note,
        'pending'
    ) RETURNING id INTO v_payment_id;
    
    RETURN v_payment_id;
END;
$$;

-- get_transparency_stats: get aggregated transparency statistics (total income, expense, and active members count)
CREATE OR REPLACE FUNCTION public.get_transparency_stats()
RETURNS TABLE (
    total_income numeric,
    total_expense numeric,
    active_members bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_income numeric;
    v_expense numeric;
    v_members bigint;
BEGIN
    SELECT COALESCE(SUM(amount), 0)::numeric INTO v_income FROM public.payments;
    SELECT COALESCE(SUM(amount), 0)::numeric INTO v_expense FROM public.expenses;
    SELECT COUNT(id) INTO v_members FROM public.members WHERE is_active = true;
    
    RETURN QUERY SELECT v_income, v_expense, v_members;
END;
$$;

-- get_transparency_chart: get last 6 months summary
CREATE OR REPLACE FUNCTION public.get_transparency_chart()
RETURNS TABLE (
    month_key text,
    income numeric,
    expense numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT to_char(date_trunc('month', d), 'YYYY-MM') AS mkey
    FROM generate_series(
      date_trunc('month', CURRENT_DATE) - interval '5 months',
      date_trunc('month', CURRENT_DATE),
      interval '1 month'
    ) d
  ),
  income_stats AS (
    SELECT to_char(date_trunc('month', payment_date), 'YYYY-MM') AS mkey, sum(amount) AS total_inc
    FROM public.payments
    GROUP BY 1
  ),
  expense_stats AS (
    SELECT to_char(date_trunc('month', expense_date::date), 'YYYY-MM') AS mkey, sum(amount) AS total_exp
    FROM public.expenses
    GROUP BY 1
  )
  SELECT 
    m.mkey::text AS month_key,
    coalesce(i.total_inc, 0)::numeric AS income,
    coalesce(e.total_exp, 0)::numeric AS expense
  FROM months m
  LEFT JOIN income_stats i ON m.mkey = i.mkey
  LEFT JOIN expense_stats e ON m.mkey = e.mkey
  ORDER BY m.mkey ASC;
END;
$$;

-- get_recent_payments: get 8 most recent payments with member name and code
CREATE OR REPLACE FUNCTION public.get_recent_payments()
RETURNS TABLE (
    id uuid,
    amount numeric,
    for_year int,
    for_month int,
    payment_date date,
    method text,
    transaction_ref text,
    member_name text,
    member_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.amount::numeric,
    p.for_year::int,
    p.for_month::int,
    p.payment_date::date,
    p.method::text,
    p.transaction_ref::text,
    m.full_name::text AS member_name,
    m.member_code::text AS member_code
  FROM public.payments p
  LEFT JOIN public.members m ON p.member_id = m.id
  ORDER BY p.payment_date DESC, p.created_at DESC
  LIMIT 8;
END;
$$;

-- get_recent_expenses: get 8 most recent expenses
CREATE OR REPLACE FUNCTION public.get_recent_expenses()
RETURNS TABLE (
    id uuid,
    amount numeric,
    title text,
    expense_date date,
    category text,
    note text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.amount::numeric,
    e.title::text,
    e.expense_date::date,
    e.category::text,
    e.note::text
  FROM public.expenses e
  ORDER BY e.expense_date DESC, e.created_at DESC
  LIMIT 8;
END;
$$;

-- 6. Ensure app_settings is part of the realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'app_settings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
    END IF;
  END IF;
END $$;
