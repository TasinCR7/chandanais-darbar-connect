
ALTER TABLE public.submissions ADD COLUMN reply text;
ALTER TABLE public.submissions ADD COLUMN replied_at timestamp with time zone;
