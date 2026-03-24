-- Create committee notices table
create table if not exists public.committee_notices (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  type text check (type in ('sms', 'whatsapp', 'internal')),
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.committee_notices enable row level security;

-- Policies for committee_notices
create policy "Admins can manage committee notices"
  on public.committee_notices
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Committee members can view active notices"
  on public.committee_notices
  for select
  using (
    exists (
      select 1 from public.committee_members
      where id = auth.uid()
      and is_active = true
    )
    and is_active = true
  );
