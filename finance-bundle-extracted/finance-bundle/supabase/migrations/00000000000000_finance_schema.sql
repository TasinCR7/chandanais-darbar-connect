-- ============================================================
-- Finance / Member-Search / Transparency — portable schema
-- Drop-in for any Supabase / Postgres project.
-- ============================================================

-- Enums --------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'treasurer', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash','bkash','nagad','rocket','bank','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.submission_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  member_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  address text,
  area text,
  joined_date date NOT NULL DEFAULT CURRENT_DATE,
  monthly_rate numeric NOT NULL DEFAULT 500,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  for_year integer NOT NULL,
  for_month integer NOT NULL CHECK (for_month BETWEEN 1 AND 12),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method public.payment_method NOT NULL DEFAULT 'cash',
  transaction_ref text,
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_member ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.payments(for_year, for_month);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text,
  approved_by text,
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);

CREATE TABLE IF NOT EXISTS public.monthly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  for_year integer NOT NULL,
  for_month integer NOT NULL CHECK (for_month BETWEEN 1 AND 12),
  target_amount numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (for_year, for_month)
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  actor_id uuid,
  actor_name text,
  old_data jsonb,
  new_data jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper functions --------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','treasurer')
  )
$$;

-- RLS ---------------------------------------------------------
ALTER TABLE public.members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;

-- Public read, staff write
CREATE POLICY "anyone reads members"  ON public.members  FOR SELECT USING (true);
CREATE POLICY "anyone reads payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "anyone reads expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "anyone reads targets"  ON public.monthly_targets FOR SELECT USING (true);
CREATE POLICY "anyone reads settings" ON public.app_settings    FOR SELECT USING (true);

CREATE POLICY "staff inserts members"  ON public.members  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff inserts payments" ON public.payments FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff inserts expenses" ON public.expenses FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff inserts targets"  ON public.monthly_targets FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff updates members"  ON public.members  FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "staff updates payments" ON public.payments FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "staff updates expenses" ON public.expenses FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "staff updates targets"  ON public.monthly_targets FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "admin deletes members"  ON public.members  FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes payments" ON public.payments FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes expenses" ON public.expenses FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes targets"  ON public.monthly_targets FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin upserts settings" ON public.app_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes settings" ON public.app_settings FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "staff reads audit logs"  ON public.audit_logs FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "system inserts audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "admin deletes audit logs" ON public.audit_logs FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "users read own roles"     ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin reads all roles"    ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin inserts roles"      ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes roles"      ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "users read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "staff reads all profiles" ON public.profiles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
