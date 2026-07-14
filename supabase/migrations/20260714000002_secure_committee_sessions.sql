-- Create committee sessions table
CREATE TABLE IF NOT EXISTS public.committee_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES public.committee_members(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT now() + interval '30 days'
);

-- Enable RLS on committee_sessions
ALTER TABLE public.committee_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage session records directly
CREATE POLICY "Admins can manage sessions" ON public.committee_sessions
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update verify_committee_member to return a session token on success
DROP FUNCTION IF EXISTS public.verify_committee_member(text[], text);

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
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, v_lockout_seconds, NULL::uuid;
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
            
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, 0, NULL::uuid;
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

        -- Create session
        INSERT INTO public.committee_sessions (member_id)
        VALUES (v_member.id)
        RETURNING public.committee_sessions.id INTO v_session_token;

        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, TRUE, TRUE, 0, v_session_token;
        RETURN;
    END IF;

    -- Case 2: Compare PIN hashes
    IF v_existing_hash = p_pin_hash THEN
        -- Clear failed attempts on success
        DELETE FROM public.committee_login_attempts WHERE phone = v_phone;
        
        -- Create session
        INSERT INTO public.committee_sessions (member_id)
        VALUES (v_member.id)
        RETURNING public.committee_sessions.id INTO v_session_token;

        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, FALSE, TRUE, 0, v_session_token;
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

        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE, v_lockout_seconds, NULL::uuid;
    END IF;
END;
$$;


-- Create secure RPC function to retrieve all committee dashboard data in one call using the session token
CREATE OR REPLACE FUNCTION public.get_committee_dashboard_data(
    p_session_token uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_id uuid;
    v_member_name text;
    v_member_designation text;
    v_member_json json;
    v_topics_json json;
    v_votes_json json;
    v_comments_json json;
    v_notices_json json;
    v_contributions_json json;
BEGIN
    -- Resolve and validate session
    SELECT member_id INTO v_member_id
    FROM public.committee_sessions
    WHERE id = p_session_token AND expires_at > now();

    IF v_member_id IS NULL THEN
        RETURN json_build_object('error', 'Invalid or expired session');
    END IF;

    -- Fetch member details
    SELECT name, designation INTO v_member_name, v_member_designation
    FROM public.committee_members
    WHERE id = v_member_id AND is_active = true;

    IF v_member_name IS NULL THEN
        RETURN json_build_object('error', 'Member is inactive or not found');
    END IF;

    v_member_json := json_build_object(
        'id', v_member_id,
        'name', v_member_name,
        'designation', v_member_designation
    );

    -- Fetch active voting topics
    SELECT coalesce(json_agg(t), '[]'::json) INTO v_topics_json
    FROM (
        SELECT id, created_at, title, description, created_by, is_active
        FROM public.vote_topics
        WHERE is_active = true
        ORDER BY created_at DESC
    ) t;

    -- Fetch votes
    SELECT coalesce(json_agg(v), '[]'::json) INTO v_votes_json
    FROM (
        SELECT id, created_at, topic_id, user_id, vote
        FROM public.votes
    ) v;

    -- Fetch committee comments
    SELECT coalesce(json_agg(c), '[]'::json) INTO v_comments_json
    FROM (
        SELECT id, created_at, user_id, message
        FROM public.committee_comments
        ORDER BY created_at DESC
    ) c;

    -- Fetch committee notices
    SELECT coalesce(json_agg(n), '[]'::json) INTO v_notices_json
    FROM (
        SELECT id, created_at, title, message, type, is_active
        FROM public.committee_notices
        WHERE is_active = true
        ORDER BY created_at DESC
    ) n;

    -- Fetch contributions matching member's name
    SELECT coalesce(json_agg(co), '[]'::json) INTO v_contributions_json
    FROM (
        SELECT id, created_at, name, amount, target_month, note, area, payment_method, transaction_id
        FROM public.committee_contributions
        WHERE name = v_member_name
        ORDER BY created_at DESC
    ) co;

    RETURN json_build_object(
        'member', v_member_json,
        'topics', v_topics_json,
        'votes', v_votes_json,
        'comments', v_comments_json,
        'notices', v_notices_json,
        'contributions', v_contributions_json
    );
END;
$$;


-- Create secure RPC function to cast a vote using the session token
CREATE OR REPLACE FUNCTION public.cast_committee_vote(
    p_session_token uuid,
    p_topic_id uuid,
    p_vote text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_id uuid;
BEGIN
    -- Validate session
    SELECT member_id INTO v_member_id
    FROM public.committee_sessions
    WHERE id = p_session_token AND expires_at > now();

    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;

    -- Insert or update vote (using primary key topic_id + user_id)
    INSERT INTO public.votes (topic_id, user_id, vote)
    VALUES (p_topic_id, v_member_id, p_vote)
    ON CONFLICT (topic_id, user_id) 
    DO UPDATE SET vote = EXCLUDED.vote;

    RETURN TRUE;
END;
$$;


-- Create secure RPC function to add a comment using the session token
CREATE OR REPLACE FUNCTION public.add_committee_comment(
    p_session_token uuid,
    p_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_id uuid;
BEGIN
    -- Validate session
    SELECT member_id INTO v_member_id
    FROM public.committee_sessions
    WHERE id = p_session_token AND expires_at > now();

    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;

    -- Insert comment
    INSERT INTO public.committee_comments (user_id, message)
    VALUES (v_member_id, p_message);

    RETURN TRUE;
END;
$$;
