-- Add monthly_due field to committee_members
ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS monthly_due DECIMAL(12, 2) DEFAULT 100;

-- Create member_dues_adjustments table for manual dues entries
CREATE TABLE IF NOT EXISTS public.member_dues_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.committee_members(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- positive = extra due, negative = credit/waiver
    note TEXT,
    adjusted_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.member_dues_adjustments ENABLE ROW LEVEL SECURITY;

-- Anyone can read dues adjustments
CREATE POLICY "Enable read access for all users" ON public.member_dues_adjustments FOR SELECT USING (true);

-- Only admins can insert/update/delete dues adjustments
CREATE POLICY "Enable all access for admins" ON public.member_dues_adjustments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com', 'tasinbook@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454', '+8801622721996')
    )
  )
);
