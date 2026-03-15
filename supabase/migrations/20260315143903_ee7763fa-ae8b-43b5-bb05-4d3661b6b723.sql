
-- Create report card feedback table
CREATE TABLE public.report_card_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID REFERENCES public.report_cards(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  message TEXT NOT NULL,
  student_name TEXT,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  sender_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_card_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (public viewers + authenticated users)
CREATE POLICY "Anyone can submit report card feedback"
  ON public.report_card_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Staff/admin can view all feedback
CREATE POLICY "Staff admin can view all feedback"
  ON public.report_card_feedback
  FOR SELECT
  TO authenticated
  USING (is_staff_or_admin(auth.uid()));

-- Instructors can view feedback on their report cards
CREATE POLICY "Instructors can view feedback on own report cards"
  ON public.report_card_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.report_cards rc
      WHERE rc.id = report_card_feedback.report_card_id
      AND rc.instructor_id = auth.uid()
    )
  );
