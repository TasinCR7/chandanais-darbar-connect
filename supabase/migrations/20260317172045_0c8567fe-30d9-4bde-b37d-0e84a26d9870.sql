-- Create notices table for dynamic announcements
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Everyone can read active notices (public site)
CREATE POLICY "Anyone can read active notices"
  ON public.notices FOR SELECT
  USING (is_active = true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default notice
INSERT INTO public.notices (title, message, is_active)
VALUES ('বিশেষ নোটিশ ও ঘোষণা', 'দরবার শরীফে স্বাগতম। সর্বশেষ আপডেটের জন্য এই নোটিশ বার দেখুন।', true);