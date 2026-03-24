-- Update has_role function to include master admin bypass
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email text;
  user_phone text;
BEGIN
  -- 1. Check user_roles table first (standard way)
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. If checking for 'admin', verify against Master Admin list
  IF _role = 'admin' THEN
    SELECT email, phone INTO user_email, user_phone FROM auth.users WHERE id = _user_id;
    
    IF user_email IN ('chandanaishdarbarsharif@gmail.com', 'tasinskder@gmail.com') OR
       user_phone IN ('+8801714338533', '+8801819614444', '+8801835674454') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Ensure all committee tables use this role check for ALL operations
-- Committee Members
DROP POLICY IF EXISTS "Admins can manage committee members" ON public.committee_members;
CREATE POLICY "Admins can manage committee members"
ON public.committee_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Committee Notices
DROP POLICY IF EXISTS "Admins can manage committee notices" ON public.committee_notices;
CREATE POLICY "Admins can manage committee notices"
ON public.committee_notices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
