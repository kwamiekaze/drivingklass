-- Add new columns to profiles table for intake edit tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS intake_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS intake_updated_by uuid,
ADD COLUMN IF NOT EXISTS intake_last_edit_role text,
ADD COLUMN IF NOT EXISTS intake_edit_count integer DEFAULT 0;

-- Create intake_form_revisions table for audit history
CREATE TABLE IF NOT EXISTS public.intake_form_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  edited_by uuid,
  edited_by_role text,
  snapshot_json jsonb NOT NULL,
  note text
);

-- Enable RLS on intake_form_revisions
ALTER TABLE public.intake_form_revisions ENABLE ROW LEVEL SECURITY;

-- RLS policies for intake_form_revisions
-- Users can view their own revision history
CREATE POLICY "Users can view own intake revisions"
ON public.intake_form_revisions
FOR SELECT
USING (user_id = auth.uid());

-- Staff/Admin can view all revisions
CREATE POLICY "Staff admin can view all intake revisions"
ON public.intake_form_revisions
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff/Admin can insert revisions for any user
CREATE POLICY "Staff admin can insert intake revisions"
ON public.intake_form_revisions
FOR INSERT
WITH CHECK (is_staff_or_admin(auth.uid()));

-- Users can insert revisions for themselves
CREATE POLICY "Users can insert own intake revisions"
ON public.intake_form_revisions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_intake_form_revisions_user_id ON public.intake_form_revisions(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_form_revisions_created_at ON public.intake_form_revisions(created_at DESC);