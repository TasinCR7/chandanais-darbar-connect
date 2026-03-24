-- ==========================================
-- 1. USER ROLES (Authentication & Admin Setup)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'user')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Admins/Users can read user roles
CREATE POLICY "Allow authenticated users to read roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (true);

-- RPC function to check user role (Admin.tsx uses this)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;


-- ==========================================
-- 2. NOTICES (Admin Announcements)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    message text,
    type text DEFAULT 'detailed' NOT NULL, -- 'scrolling' (top bar) or 'detailed' (home box)
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Anyone can read notices
CREATE POLICY "Allow public read on active notices" 
ON public.notices 
FOR SELECT 
TO public 
USING (true);

-- Only admins can insert/update/delete notices
CREATE POLICY "Allow admins to manage notices" 
ON public.notices 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ==========================================
-- 3. SUBMISSIONS (QnA, Complaints, Doa Forms)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    type text NOT NULL, -- 'question', 'complaint', or 'doa'
    name text NOT NULL,
    phone text,
    subject text NOT NULL,
    address text, -- specifically used for 'doa' forms
    details text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    reply text,
    replied_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous form submissions
CREATE POLICY "Allow public insert on submissions" 
ON public.submissions 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Only admins can view, update (reply, mark read) or delete submissions
CREATE POLICY "Allow admins to manage submissions" 
ON public.submissions 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ==========================================
-- 4. GALLERY (Images & Media)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.gallery (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    url text NOT NULL,
    caption text,
    category text NOT NULL DEFAULT 'দরবার শরীফ',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can read gallery
CREATE POLICY "Allow public read on gallery" 
ON public.gallery 
FOR SELECT 
TO public 
USING (true);

-- Only admins can manage gallery
CREATE POLICY "Allow admins to manage gallery" 
ON public.gallery 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- 5. DONATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.donations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_name text NOT NULL,
    donor_phone text NOT NULL,
    amount numeric NOT NULL,
    donation_category text NOT NULL,
    recipient_id text,
    payment_method text NOT NULL,
    transaction_id text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Allow public insert on donations
CREATE POLICY "Allow public insert on donations" 
ON public.donations 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Only admins can manage donations
CREATE POLICY "Allow admins to manage donations" 
ON public.donations 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
