-- Update has_role function to include latest master admin bypass list
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
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
    
    IF user_email IN (
         'chandanaishdarbarsharif@gmail.com', 
         'tasinskder@gmail.com', 
         'tasinbook@gmail.com'
       ) OR
       user_phone IN (
         '+8801714338533', 
         '+8801819614444', 
         '+8801835674454', 
         '+8801622721996', 
         '+8801316131444'
       ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

