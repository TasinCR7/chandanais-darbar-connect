-- 1. Create private auth table
CREATE TABLE IF NOT EXISTS public.committee_member_auth (
    member_id uuid REFERENCES public.committee_members(id) ON DELETE CASCADE PRIMARY KEY,
    pin_hash text NOT NULL
);

-- Move existing PIN hashes from committee_members to the new private table
INSERT INTO public.committee_member_auth (member_id, pin_hash)
SELECT id, pin_hash 
FROM public.committee_members 
WHERE pin_hash IS NOT NULL
ON CONFLICT (member_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash;

-- Drop pin_hash column from public table
ALTER TABLE public.committee_members DROP COLUMN IF EXISTS pin_hash;

-- Enable RLS on the private table
ALTER TABLE public.committee_member_auth ENABLE ROW LEVEL SECURITY;

-- Admins can view/manage PIN entries
CREATE POLICY "Admins can manage auth entries" ON public.committee_member_auth
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Create computed column function to check if PIN is set
CREATE OR REPLACE FUNCTION public.has_pin(m public.committee_members)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.committee_member_auth WHERE member_id = m.id
  );
$$;

-- 3. Create verification function
CREATE OR REPLACE FUNCTION public.verify_committee_member(
    p_phone_variants text[],
    p_pin_hash text
)
RETURNS TABLE (
    id uuid,
    name text,
    designation text,
    is_new_pin boolean,
    success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member record;
    v_existing_hash text;
BEGIN
    -- Find active member matching any of the phone variants
    SELECT * INTO v_member
    FROM public.committee_members
    WHERE is_active = true AND phone = ANY(p_phone_variants)
    LIMIT 1;

    -- If no member found
    IF v_member.id IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE;
        RETURN;
    END IF;

    -- Get existing PIN hash
    SELECT pin_hash INTO v_existing_hash
    FROM public.committee_member_auth
    WHERE member_id = v_member.id;

    -- Case 1: PIN not set yet (first time setup)
    IF v_existing_hash IS NULL THEN
        -- Set the PIN hash
        INSERT INTO public.committee_member_auth (member_id, pin_hash)
        VALUES (v_member.id, p_pin_hash);

        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, TRUE, TRUE;
        RETURN;
    END IF;

    -- Case 2: Compare PIN hashes
    IF v_existing_hash = p_pin_hash THEN
        RETURN QUERY SELECT v_member.id, v_member.name, v_member.designation, FALSE, TRUE;
    ELSE
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, FALSE, FALSE;
    END IF;
END;
$$;
