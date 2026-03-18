-- Allow all operations on notices (no auth required for now - simple admin)
CREATE POLICY "Anyone can insert notices" ON public.notices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notices" ON public.notices FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete notices" ON public.notices FOR DELETE USING (true);

-- Also allow reading all notices (not just active) for admin page
DROP POLICY "Anyone can read active notices" ON public.notices;
CREATE POLICY "Anyone can read notices" ON public.notices FOR SELECT USING (true);