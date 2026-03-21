
-- Create permit_questions table
CREATE TABLE public.permit_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL DEFAULT 'a',
  explanation text,
  image_url text,
  category text NOT NULL DEFAULT 'general',
  difficulty text NOT NULL DEFAULT 'medium',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permit_questions ENABLE ROW LEVEL SECURITY;

-- Staff/admin can manage all questions
CREATE POLICY "Staff admin can manage permit questions"
  ON public.permit_questions FOR ALL
  TO public
  USING (is_staff_or_admin(auth.uid()));

-- Instructors can view questions
CREATE POLICY "Instructors can view permit questions"
  ON public.permit_questions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'instructor'::app_role));

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('permit-question-images', 'permit-question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for question images
CREATE POLICY "Staff admin can upload question images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'permit-question-images' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Anyone can view question images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'permit-question-images');

CREATE POLICY "Staff admin can delete question images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'permit-question-images' AND is_staff_or_admin(auth.uid()));
