-- Allow admins to delete permit questions
CREATE POLICY "Staff admin can delete permit questions"
  ON public.permit_questions FOR DELETE
  TO public
  USING (is_staff_or_admin(auth.uid()));
