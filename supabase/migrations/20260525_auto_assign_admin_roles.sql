-- 1. Scan existing auth.users and assign 'admin' role in public.user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE 
  email IN (
    'chandanaishdarbarsharif@gmail.com', 
    'tasinskder@gmail.com', 
    'tasinbook@gmail.com'
  ) OR
  phone IN (
    '+8801714338533', 
    '+8801819614444', 
    '+8801835674454', 
    '+8801622721996', 
    '+8801316131444'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Create function to auto-assign admin roles on new/updated auth.users inserts/updates
CREATE OR REPLACE FUNCTION public.handle_auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IN (
       'chandanaishdarbarsharif@gmail.com', 
       'tasinskder@gmail.com', 
       'tasinbook@gmail.com'
     ) OR
     NEW.phone IN (
       '+8801714338533', 
       '+8801819614444', 
       '+8801835674454', 
       '+8801622721996', 
       '+8801316131444'
     ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Create the trigger to execute public.handle_auto_assign_admin_role
DROP TRIGGER IF EXISTS tr_auto_assign_admin_role ON auth.users;
CREATE TRIGGER tr_auto_assign_admin_role
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_assign_admin_role();
