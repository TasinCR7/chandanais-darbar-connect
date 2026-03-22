
-- Add user_id to committee_members to link them to auth users
ALTER TABLE public.committee_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Vote topics table (admin creates these)
CREATE TABLE IF NOT EXISTS public.vote_topics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    type text NOT NULL DEFAULT 'monthly' CHECK (type IN ('monthly', 'yearly')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vote_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active vote topics" ON public.vote_topics
FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage vote topics" ON public.vote_topics
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id uuid REFERENCES public.vote_topics(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vote text NOT NULL CHECK (vote IN ('satisfied', 'unsatisfied')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(topic_id, user_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Committee members can read votes" ON public.votes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Committee members can insert own votes" ON public.votes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Committee members can update own votes" ON public.votes
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage votes" ON public.votes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Committee comments table
CREATE TABLE IF NOT EXISTS public.committee_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.committee_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read comments" ON public.committee_comments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members can insert own comments" ON public.committee_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can delete own comments" ON public.committee_comments
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage comments" ON public.committee_comments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
