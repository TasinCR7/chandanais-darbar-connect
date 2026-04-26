-- Create committee_expenses table
CREATE TABLE IF NOT EXISTS public.committee_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create committee_members table (for due tracking and profile)
CREATE TABLE IF NOT EXISTS public.committee_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    designation TEXT,
    area TEXT,
    phone TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create committee_contributions table
CREATE TABLE IF NOT EXISTS public.committee_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    area TEXT,
    note TEXT,
    target_month TEXT,
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.committee_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_contributions ENABLE ROW LEVEL SECURITY;

-- Policies for committee_expenses
CREATE POLICY "Enable read access for all users" ON public.committee_expenses FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.committee_expenses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454')
    )
  )
);

-- Policies for committee_members
CREATE POLICY "Enable read access for all users" ON public.committee_members FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.committee_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454')
    )
  )
);

-- Policies for committee_contributions
CREATE POLICY "Enable read access for all users" ON public.committee_contributions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.committee_contributions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable all access for admins" ON public.committee_contributions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454')
    )
  )
);
