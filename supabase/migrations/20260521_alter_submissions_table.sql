-- Alter submissions table to support 'doa' type and address column
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS address text;

-- Drop the old check constraint limiting type to 'question' and 'complaint'
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_type_check;

-- Add a new check constraint that supports 'question', 'complaint', and 'doa'
ALTER TABLE public.submissions ADD CONSTRAINT submissions_type_check CHECK (type IN ('question', 'complaint', 'doa'));
