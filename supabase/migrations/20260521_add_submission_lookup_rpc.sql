-- Create an RPC function to securely retrieve a submission by its UUID or the first 8 characters (tracking ID)
CREATE OR REPLACE FUNCTION public.get_submission_by_tracking(p_tracking text)
RETURNS TABLE (
    id uuid,
    created_at timestamp with time zone,
    type text,
    name text,
    phone text,
    subject text,
    address text,
    details text,
    is_read boolean,
    reply text,
    replied_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.type, s.name, s.phone, s.subject, s.address, s.details, s.is_read, s.reply, s.replied_at
  FROM public.submissions s
  WHERE s.id::text = p_tracking 
     OR REPLACE(s.id::text, '-', '') = p_tracking
     OR REPLACE(s.id::text, '-', '') LIKE p_tracking || '%';
END;
$$;
