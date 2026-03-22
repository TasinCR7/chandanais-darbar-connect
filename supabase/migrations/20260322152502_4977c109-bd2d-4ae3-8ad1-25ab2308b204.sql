
CREATE TABLE IF NOT EXISTS public.committee_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    designation text NOT NULL,
    phone text,
    image_url text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

-- Anyone can read active members
CREATE POLICY "Anyone can read active committee members"
ON public.committee_members FOR SELECT
TO public
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage committee members"
ON public.committee_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
