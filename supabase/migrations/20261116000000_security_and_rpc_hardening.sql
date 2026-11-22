-- Comprehensive Security, Privacy & RPC Hardening Migration

-- 0. Phone normalization helper (returns last 11 digits starting with 01 when possible)
CREATE OR REPLACE FUNCTION public.normalize_bd_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') ~ '^8801[3-9][0-9]{8}$'
      THEN substring(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') from 3)
    WHEN regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') ~ '^1[3-9][0-9]{8}$'
      THEN '0' || regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
    ELSE regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
  END;
$$;

-- 1. Harden tracking lookup: disallow LIKE wildcards, require >= 8 hex chars, limit 1, mask PII for non-staff
CREATE OR REPLACE FUNCTION public.get_submission_by_tracking(p_tracking text)
RETURNS TABLE (
    id uuid,
    created_at timestamp with time zone,
    type text,
    name text,
    phone text,
    subject text,
    address text,
    details text,
    is_read boolean,
    reply text,
    replied_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean text;
    v_staff boolean;
BEGIN
    v_clean := lower(regexp_replace(coalesce(p_tracking, ''), '[-\s]', '', 'g'));
    IF v_clean !~ '^[0-9a-f]{8,32}$' THEN
        RETURN;
    END IF;

    v_staff := public.is_staff(auth.uid());

    RETURN QUERY
    SELECT
        s.id,
        s.created_at,
        s.type,
        s.name,
        CASE
            WHEN v_staff THEN s.phone
            WHEN s.phone IS NULL OR length(trim(s.phone)) = 0 THEN NULL::text
            WHEN length(trim(s.phone)) >= 6 THEN substring(trim(s.phone) from 1 for 3) || '****' || right(trim(s.phone), 2)
            ELSE '****'::text
        END AS phone,
        s.subject,
        CASE WHEN v_staff THEN s.address ELSE NULL::text END AS address,
        s.details,
        s.is_read,
        s.reply,
        s.replied_at
    FROM public.submissions s
    WHERE (
        (length(v_clean) = 32 AND replace(s.id::text, '-', '') = v_clean)
        OR (length(v_clean) >= 8 AND left(replace(s.id::text, '-', ''), length(v_clean)) = v_clean)
    )
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$;

-- Harden public submission RPC bounds
CREATE OR REPLACE FUNCTION public.insert_submission(
    p_type text,
    p_name text,
    p_phone text,
    p_subject text,
    p_details text,
    p_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
    v_type text := lower(trim(coalesce(p_type, '')));
    v_name text := trim(coalesce(p_name, ''));
    v_subject text := trim(coalesce(p_subject, ''));
    v_details text := trim(coalesce(p_details, ''));
BEGIN
    IF v_type NOT IN ('doa', 'question', 'complaint') THEN
        RAISE EXCEPTION 'Invalid submission type';
    END IF;
    IF length(v_name) < 1 OR length(v_name) > 120 THEN
        RAISE EXCEPTION 'Invalid name length';
    END IF;
    IF length(v_subject) < 1 OR length(v_subject) > 250 THEN
        RAISE EXCEPTION 'Invalid subject length';
    END IF;
    IF length(v_details) < 1 OR length(v_details) > 3000 THEN
        RAISE EXCEPTION 'Invalid details length';
    END IF;

    INSERT INTO public.submissions (type, name, phone, subject, details, address, is_read, reply, replied_at)
    VALUES (
        v_type,
        v_name,
        NULLIF(trim(coalesce(p_phone, '')), ''),
        v_subject,
        v_details,
        NULLIF(trim(coalesce(p_address, '')), ''),
        false,
        NULL,
        NULL
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- 2. Harden member lookup (AND logic when both code & phone provided, include area, mask phone for non-staff)
DROP FUNCTION IF EXISTS public.search_member(text, text);

CREATE OR REPLACE FUNCTION public.search_member(p_code text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    member_code text,
    full_name text,
    phone text,
    area text,
    joined_date date,
    monthly_rate numeric,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code text := NULLIF(trim(coalesce(p_code, '')), '');
    v_phone text := NULLIF(public.normalize_bd_phone(p_phone), '');
    v_staff boolean := public.is_staff(auth.uid());
BEGIN
    IF v_code IS NULL AND (v_phone IS NULL OR length(v_phone) < 10) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.member_code,
        m.full_name,
        CASE
            WHEN v_staff THEN m.phone
            WHEN m.phone IS NULL OR length(trim(m.phone)) = 0 THEN NULL::text
            WHEN length(trim(m.phone)) >= 6 THEN substring(trim(m.phone) from 1 for 3) || '*****' || right(trim(m.phone), 3)
            ELSE '*****'::text
        END AS phone,
        m.area,
        m.joined_date::date,
        m.monthly_rate::numeric,
        m.is_active
    FROM public.members m
    WHERE (
        v_code IS NULL
        OR lower(trim(m.member_code)) = lower(v_code)
    )
    AND (
        v_phone IS NULL
        OR public.normalize_bd_phone(m.phone) = v_phone
    )
    LIMIT 5;
END;
$$;

-- Safe single-member public lookup by UUID for /member/:id profile page
CREATE OR REPLACE FUNCTION public.get_member_by_id(p_member_id uuid)
RETURNS TABLE (
    id uuid,
    member_code text,
    full_name text,
    phone text,
    area text,
    joined_date date,
    monthly_rate numeric,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff boolean := public.is_staff(auth.uid());
BEGIN
    IF p_member_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.member_code,
        m.full_name,
        CASE
            WHEN v_staff THEN m.phone
            WHEN m.phone IS NULL OR length(trim(m.phone)) = 0 THEN NULL::text
            WHEN length(trim(m.phone)) >= 6 THEN substring(trim(m.phone) from 1 for 3) || '*****' || right(trim(m.phone), 3)
            ELSE '*****'::text
        END AS phone,
        m.area,
        m.joined_date::date,
        m.monthly_rate::numeric,
        m.is_active
    FROM public.members m
    WHERE m.id = p_member_id
    LIMIT 1;
END;
$$;

-- 3. Harden online member payment submission with strict validation & default date
DROP FUNCTION IF EXISTS public.submit_member_payment(uuid, numeric, int, int, date, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_member_payment(
    p_member_id uuid,
    p_amount numeric,
    p_for_year int,
    p_for_month int,
    p_payment_date date DEFAULT CURRENT_DATE,
    p_method text DEFAULT 'bkash',
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
    v_method text := lower(trim(coalesce(p_method, '')));
    v_ref text := NULLIF(trim(coalesce(p_transaction_ref, '')), '');
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.members WHERE id = p_member_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid or inactive member';
    END IF;

    IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN
        RAISE EXCEPTION 'Invalid payment amount';
    END IF;

    IF p_for_month IS NULL OR p_for_month < 1 OR p_for_month > 12 THEN
        RAISE EXCEPTION 'Invalid month';
    END IF;

    IF p_for_year IS NULL OR p_for_year < 2000 OR p_for_year > 2100 THEN
        RAISE EXCEPTION 'Invalid year';
    END IF;

    IF v_method NOT IN ('bkash', 'nagad', 'rocket', 'bank', 'cash', 'other') THEN
        RAISE EXCEPTION 'Unsupported payment method';
    END IF;

    IF v_ref IS NOT NULL AND length(v_ref) > 100 THEN
        RAISE EXCEPTION 'Transaction reference too long';
    END IF;

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
        COALESCE(p_payment_date, CURRENT_DATE),
        v_method,
        v_ref,
        NULLIF(left(trim(coalesce(p_note, '')), 250), ''),
        'pending'
    ) RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$;

-- 4. Count ONLY approved payments in public transparency endpoints
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
    SELECT COALESCE(SUM(amount), 0)::numeric INTO v_income
    FROM public.payments
    WHERE status = 'approved' OR status IS NULL;

    SELECT COALESCE(SUM(amount), 0)::numeric INTO v_expense
    FROM public.expenses;

    SELECT COUNT(id) INTO v_members
    FROM public.members
    WHERE is_active = true;

    RETURN QUERY SELECT v_income, v_expense, v_members;
END;
$$;

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
    WHERE status = 'approved' OR status IS NULL
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
  WHERE p.status = 'approved' OR p.status IS NULL
  ORDER BY p.payment_date DESC, p.created_at DESC
  LIMIT 8;
END;
$$;

-- 5. Committee session validation, logout, and expired-lockout reset fix
CREATE OR REPLACE FUNCTION public.validate_committee_session(p_session_token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.committee_sessions s
    JOIN public.committee_members m ON m.id = s.member_id
    WHERE s.id = p_session_token
      AND s.expires_at > now()
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.logout_committee_session(p_session_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_token IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.committee_sessions WHERE id = p_session_token;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_committee_member(
    p_phone_variants text[],
    p_pin_hash text
)
RETURNS TABLE (
    id uuid,
    name text,
    designation text,
    is_new_pin boolean,
    success boolean,
    lockout_remaining_seconds integer,
    session_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member record;
    v_existing_hash text;
    v_attempts_record record;
    v_phone text;
    v_lockout_seconds integer := 0;
    v_session_token uuid := NULL;
BEGIN
    IF p_phone_variants IS NULL OR coalesce(array_length(p_phone_variants, 1), 0) = 0 THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, 0, NULL::uuid;
        RETURN;
    END IF;

    SELECT phone INTO v_phone
    FROM public.committee_members
    WHERE is_active = true AND phone = ANY(p_phone_variants)
    LIMIT 1;

    IF v_phone IS NULL THEN
        v_phone := p_phone_variants[1];
    END IF;

    SELECT * INTO v_attempts_record
    FROM public.committee_login_attempts
    WHERE phone = v_phone;

    IF v_attempts_record.phone IS NOT NULL AND v_attempts_record.locked_until IS NOT NULL THEN
        IF v_attempts_record.locked_until > now() THEN
            v_lockout_seconds := EXTRACT(EPOCH FROM (v_attempts_record.locked_until - now()))::integer;
            RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, v_lockout_seconds, NULL::uuid;
            RETURN;
        ELSE
            -- Expired lockout must reset attempts back to zero
            DELETE FROM public.committee_login_attempts WHERE phone = v_phone;
        END IF;
    END IF;

    SELECT * INTO v_member
    FROM public.committee_members
    WHERE is_active = true AND phone = v_phone
    LIMIT 1;

    IF v_member.id IS NULL THEN
        INSERT INTO public.committee_login_attempts (phone, attempts, last_attempt_at)
        VALUES (v_phone, 1, now())
        ON CONFLICT (phone) DO UPDATE
        SET attempts = public.committee_login_attempts.attempts + 1,
            last_attempt_at = now(),
            locked_until = CASE WHEN public.committee_login_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END;

        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, 0, NULL::uuid;
        RETURN;
    END IF;

    SELECT pin_hash INTO v_existing_hash
    FROM public.committee_member_auth
    WHERE member_id = v_member.id;

    IF v_existing_hash IS NULL THEN
        DELETE FROM public.committee_login_attempts WHERE phone = v_phone;

        INSERT INTO public.committee_member_auth (member_id, pin_hash)
        VALUES (v_member.id, p_pin_hash);

        INSERT INTO public.committee_sessions (member_id)
        VALUES (v_member.id)
        RETURNING public.committee_sessions.id INTO v_session_token;

        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, TRUE, TRUE, 0, v_session_token;
        RETURN;
    END IF;

    IF v_existing_hash = p_pin_hash THEN
        DELETE FROM public.committee_login_attempts WHERE phone = v_phone;

        INSERT INTO public.committee_sessions (member_id)
        VALUES (v_member.id)
        RETURNING public.committee_sessions.id INTO v_session_token;

        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, FALSE, TRUE, 0, v_session_token;
    ELSE
        INSERT INTO public.committee_login_attempts (phone, attempts, last_attempt_at)
        VALUES (v_phone, 1, now())
        ON CONFLICT (phone) DO UPDATE
        SET attempts = public.committee_login_attempts.attempts + 1,
            last_attempt_at = now(),
            locked_until = CASE WHEN public.committee_login_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END;

        SELECT * INTO v_attempts_record
        FROM public.committee_login_attempts
        WHERE phone = v_phone;

        IF v_attempts_record.locked_until IS NOT NULL AND v_attempts_record.locked_until > now() THEN
            v_lockout_seconds := EXTRACT(EPOCH FROM (v_attempts_record.locked_until - now()))::integer;
        END IF;

        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, v_lockout_seconds, NULL::uuid;
    END IF;
END;
$$;

-- 6. Tighten legacy permissive RLS policies

-- donations: disallow public inserting pre-verified rows or invalid negative amounts
DROP POLICY IF EXISTS "Public insert donations" ON public.donations;
DROP POLICY IF EXISTS "Allow public insert on donations" ON public.donations;
CREATE POLICY "Public insert donations" ON public.donations
    FOR INSERT TO public
    WITH CHECK (
        (status IS NULL OR status = 'pending')
        AND amount > 0
        AND amount <= 10000000
        AND length(trim(donor_name)) BETWEEN 1 AND 120
        AND length(trim(donor_phone)) BETWEEN 6 AND 30
        AND length(trim(transaction_id)) BETWEEN 1 AND 120
    );

-- submissions: disallow public injecting replies/read flags directly
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow public insert on submissions" ON public.submissions;
CREATE POLICY "Anyone can insert submissions" ON public.submissions
    FOR INSERT TO public
    WITH CHECK (
        type IN ('doa', 'question', 'complaint')
        AND (is_read IS NULL OR is_read = false)
        AND reply IS NULL
        AND replied_at IS NULL
        AND length(trim(name)) BETWEEN 1 AND 120
        AND length(trim(subject)) BETWEEN 1 AND 250
        AND length(trim(details)) BETWEEN 1 AND 3000
    );

-- committee_members: public reads only active members
DROP POLICY IF EXISTS "Public read committee_members" ON public.committee_members;
CREATE POLICY "Public read committee_members" ON public.committee_members
    FOR SELECT TO public
    USING (is_active = true OR public.is_staff(auth.uid()));

-- user_roles: users see only their own roles (or staff/admin)
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Explicit grants for anon/authenticated clients on public RPCs
GRANT EXECUTE ON FUNCTION public.get_submission_by_tracking(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_submission(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_member(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_member_payment(uuid, numeric, int, int, date, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_transparency_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_transparency_chart() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_payments() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_committee_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.logout_committee_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_committee_member(text[], text) TO anon, authenticated;
