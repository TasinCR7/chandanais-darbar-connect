-- Security Hardening: Restrict public access to administrative data

-- 1. committee_expenses
DROP POLICY IF EXISTS "Enable read access for all users" ON public.committee_expenses;
CREATE POLICY "Enable read access for admins" ON public.committee_expenses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com', 'tasinbook@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454', '+8801622721996')
    )
  ) OR public.has_role(auth.uid(), 'admin')
);

-- 2. committee_members
DROP POLICY IF EXISTS "Enable read access for all users" ON public.committee_members;
CREATE POLICY "Enable read access for admins" ON public.committee_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com', 'tasinbook@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454', '+8801622721996')
    )
  ) OR public.has_role(auth.uid(), 'admin')
);

-- 3. committee_contributions
DROP POLICY IF EXISTS "Enable read access for all users" ON public.committee_contributions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.committee_contributions;
CREATE POLICY "Enable read access for admins" ON public.committee_contributions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com', 'tasinbook@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454', '+8801622721996')
    )
  ) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Enable insert for admins" ON public.committee_contributions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com', 'tasinbook@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454', '+8801622721996')
    )
  ) OR public.has_role(auth.uid(), 'admin')
);

-- 4. member_dues_adjustments
DROP POLICY IF EXISTS "Enable read access for all users" ON public.member_dues_adjustments;
CREATE POLICY "Enable read access for admins" ON public.member_dues_adjustments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND (
      email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com', 'tasinbook@gmail.com')
      OR phone IN ('+8801714338533', '+8801819614444', '+8801835674454', '+8801622721996')
    )
  ) OR public.has_role(auth.uid(), 'admin')
);
