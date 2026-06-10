-- Add pin_hash column to committee_members table to support PIN-based authentication
ALTER TABLE public.committee_members ADD COLUMN IF NOT EXISTS pin_hash text;
