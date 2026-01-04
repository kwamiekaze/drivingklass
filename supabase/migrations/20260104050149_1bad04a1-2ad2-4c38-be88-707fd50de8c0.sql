-- Create approved_intakes table to store approved intake records
CREATE TABLE public.approved_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intake_submission_id text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  snapshot_json jsonb NOT NULL,
  files jsonb,
  pdf_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_approved_intakes_user_id ON public.approved_intakes(user_id);
CREATE INDEX idx_approved_intakes_approved_at ON public.approved_intakes(approved_at);

-- Enable RLS
ALTER TABLE public.approved_intakes ENABLE ROW LEVEL SECURITY;

-- RLS policies: Only staff/admin can manage approved intakes
CREATE POLICY "Staff admin can manage approved intakes"
ON public.approved_intakes
FOR ALL
USING (is_staff_or_admin(auth.uid()));

-- Create storage bucket for approved intakes
INSERT INTO storage.buckets (id, name, public)
VALUES ('approved-intakes', 'approved-intakes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for approved-intakes bucket
CREATE POLICY "Staff admin can read approved intakes files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'approved-intakes' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff admin can insert approved intakes files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'approved-intakes' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff admin can delete approved intakes files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'approved-intakes' AND is_staff_or_admin(auth.uid()));