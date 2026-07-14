-- Create login attempts table
CREATE TABLE IF NOT EXISTS public.committee_login_attempts (
    phone text PRIMARY KEY,
    attempts integer DEFAULT 0,
    locked_until timestamp with time zone NULL,
    last_attempt_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on login attempts
ALTER TABLE public.committee_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage login attempts directly
CREATE POLICY "Admins can manage login attempts" ON public.committee_login_attempts
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update verify_committee_member function to enforce rate limiting and server-side lockout
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
    lockout_remaining_seconds integer
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
BEGIN
    -- Resolve the actual phone number from the database for matching variants
    SELECT phone INTO v_phone
    FROM public.committee_members
    WHERE is_active = true AND phone = ANY(p_phone_variants)
    LIMIT 1;

    -- If no phone number matched, look for the first variant as a fallback to track lockout
    IF v_phone IS NULL THEN
        v_phone := p_phone_variants[1];
    END IF;

    -- Check if locked out
    SELECT * INTO v_attempts_record
    FROM public.committee_login_attempts
    WHERE phone = v_phone;

    IF v_attempts_record.phone IS NOT NULL AND v_attempts_record.locked_until IS NOT NULL AND v_attempts_record.locked_until > now() THEN
        v_lockout_seconds := EXTRACT(EPOCH FROM (v_attempts_record.locked_until - now()))::integer;
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, v_lockout_seconds;
        RETURN;
    END IF;

    -- Find active member matching resolved phone
    SELECT * INTO v_member
    FROM public.committee_members
    WHERE is_active = true AND phone = v_phone
    LIMIT 1;

    -- If no member found
    IF v_member.id IS NULL THEN
        -- Record failed attempt to prevent brute-forcing non-existent accounts
        INSERT INTO public.committee_login_attempts (phone, attempts, last_attempt_at)
        VALUES (v_phone, 1, now())
        ON CONFLICT (phone) DO UPDATE
        SET attempts = public.committee_login_attempts.attempts + 1,
            last_attempt_at = now(),
            locked_until = CASE WHEN public.committee_login_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END;
            
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, 0;
        RETURN;
    END IF;

    -- Get existing PIN hash
    SELECT pin_hash INTO v_existing_hash
    FROM public.committee_member_auth
    WHERE member_id = v_member.id;

    -- Case 1: PIN not set yet (first time setup)
    IF v_existing_hash IS NULL THEN
        -- Clear failed attempts
        DELETE FROM public.committee_login_attempts WHERE phone = v_phone;
        
        -- Set the PIN hash
        INSERT INTO public.committee_member_auth (member_id, pin_hash)
        VALUES (v_member.id, p_pin_hash);

        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, TRUE, TRUE, 0;
        RETURN;
    END IF;

    -- Case 2: Compare PIN hashes
    IF v_existing_hash = p_pin_hash THEN
        -- Clear failed attempts on success
        DELETE FROM public.committee_login_attempts WHERE phone = v_phone;
        
        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, FALSE, TRUE, 0;
    ELSE
        -- Record failed attempt
        INSERT INTO public.committee_login_attempts (phone, attempts, last_attempt_at)
        VALUES (v_phone, 1, now())
        ON CONFLICT (phone) DO UPDATE
        SET attempts = public.committee_login_attempts.attempts + 1,
            last_attempt_at = now(),
            locked_until = CASE WHEN public.committee_login_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END;
            
        -- Re-fetch to get lockout status
        SELECT * INTO v_attempts_record
        FROM public.committee_login_attempts
        WHERE phone = v_phone;
        
        IF v_attempts_record.locked_until IS NOT NULL AND v_attempts_record.locked_until > now() THEN
            v_lockout_seconds := EXTRACT(EPOCH FROM (v_attempts_record.locked_until - now()))::integer;
        END IF;

        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, v_lockout_seconds;
    END IF;
END;
$$;
