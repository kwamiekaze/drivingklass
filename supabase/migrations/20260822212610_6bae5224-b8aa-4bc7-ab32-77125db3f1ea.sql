DROP POLICY IF EXISTS "Users can update own intake fields" ON public.profiles;
CREATE POLICY "Users can update own intake fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = public.acting_user_id())
WITH CHECK (id = public.acting_user_id());