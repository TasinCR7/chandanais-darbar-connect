-- Security Hardening Migration
-- Tighten RLS policies for tables that were previously too permissive

-- 1. Tighten Votes table access
-- Old policy allowed any authenticated user to see all votes.
-- New policy: Users only see their own votes, Admins see all.
DROP POLICY IF EXISTS "Committee members can read votes" ON public.votes;
CREATE POLICY "Committee members can read own votes" ON public.votes
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2. Tighten Committee Comments table access
-- Old policy allowed any authenticated user to see all comments.
-- New policy: Users only see their own comments, Admins see all.
DROP POLICY IF EXISTS "Authenticated can read comments" ON public.committee_comments;
CREATE POLICY "Committee members can read own comments" ON public.committee_comments
FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. Ensure Committee Members phone numbers are not accidentally leaked
-- Adding a note that phone number is currently required for client-side login, 
-- but access is limited to authenticated users who are active.
-- (No change needed here as it's already using is_active = true)

-- 4. Audit: Ensure all tables have RLS enabled (re-affirming)
ALTER TABLE IF EXISTS public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.committee_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.committee_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vote_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.finances ENABLE ROW LEVEL SECURITY;
