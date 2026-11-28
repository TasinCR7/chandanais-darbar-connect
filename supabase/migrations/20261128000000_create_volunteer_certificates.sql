-- Volunteer Certificate Portal schema & public verification RPCs
-- Run this once in Supabase SQL Editor to enable database storage & online QR verification.

CREATE TABLE IF NOT EXISTS public.volunteer_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code text NOT NULL UNIQUE,
  volunteer_name text NOT NULL,
  father_name text,
  phone text,
  address text,
  role_title text NOT NULL DEFAULT 'স্বেচ্ছাসেবক',
  event_name text NOT NULL,
  service_period text,
  issue_date date NOT NULL DEFAULT current_date,
  signatory_name text NOT NULL DEFAULT 'শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী',
  signatory_title text NOT NULL DEFAULT 'গদ্দীনশীন পীর ও প্রধান খেদমতকারী',
  language text NOT NULL DEFAULT 'bn' CHECK (language IN ('bn', 'en')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_certificates
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'bn' CHECK (language IN ('bn', 'en'));

CREATE INDEX IF NOT EXISTS idx_volunteer_certificates_code_upper
  ON public.volunteer_certificates (upper(certificate_code));

CREATE INDEX IF NOT EXISTS idx_volunteer_certificates_created_at
  ON public.volunteer_certificates (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_volunteer_certificates_phone
  ON public.volunteer_certificates (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE public.volunteer_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage volunteer certificates" ON public.volunteer_certificates;
CREATE POLICY "Admins can manage volunteer certificates"
  ON public.volunteer_certificates
  FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.verify_volunteer_certificate(p_code text)
RETURNS TABLE (
  id uuid,
  certificate_code text,
  volunteer_name text,
  father_name text,
  address text,
  role_title text,
  event_name text,
  service_period text,
  issue_date date,
  signatory_name text,
  signatory_title text,
  language text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vc.id,
    vc.certificate_code,
    vc.volunteer_name,
    vc.father_name,
    vc.address,
    vc.role_title,
    vc.event_name,
    vc.service_period,
    vc.issue_date,
    vc.signatory_name,
    vc.signatory_title,
    vc.language,
    vc.status,
    vc.created_at
  FROM public.volunteer_certificates vc
  WHERE upper(trim(vc.certificate_code)) = upper(trim(coalesce(p_code, '')))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_volunteer_certificates_by_phone(p_phone text)
RETURNS TABLE (
  id uuid,
  certificate_code text,
  volunteer_name text,
  father_name text,
  address text,
  role_title text,
  event_name text,
  service_period text,
  issue_date date,
  signatory_name text,
  signatory_title text,
  language text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') AS digits
  )
  SELECT
    vc.id,
    vc.certificate_code,
    vc.volunteer_name,
    vc.father_name,
    vc.address,
    vc.role_title,
    vc.event_name,
    vc.service_period,
    vc.issue_date,
    vc.signatory_name,
    vc.signatory_title,
    vc.language,
    vc.status,
    vc.created_at
  FROM public.volunteer_certificates vc, cleaned c
  WHERE length(c.digits) >= 10
    AND vc.status = 'active'
    AND right(regexp_replace(coalesce(vc.phone, ''), '[^0-9]', '', 'g'), 10) = right(c.digits, 10)
  ORDER BY vc.issue_date DESC, vc.created_at DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.verify_volunteer_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_volunteer_certificates_by_phone(text) TO anon, authenticated;
