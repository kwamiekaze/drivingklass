CREATE POLICY "Users can delete own ratings"
ON public.report_card_ratings
FOR DELETE
TO anon, authenticated
USING ((student_id = acting_user_id()) OR ((is_public_view = true) AND (student_id IS NULL)));

GRANT DELETE ON public.report_card_ratings TO authenticated;
GRANT DELETE ON public.report_card_ratings TO anon;