
-- 1. Create proposal_edit_requests table
CREATE TABLE public.proposal_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.schedule_proposals(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  note_text text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own edit requests"
  ON public.proposal_edit_requests FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own edit requests"
  ON public.proposal_edit_requests FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Staff admin can manage all edit requests"
  ON public.proposal_edit_requests FOR ALL
  TO authenticated
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can view edit requests for their proposals"
  ON public.proposal_edit_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.schedule_proposals sp
    WHERE sp.id = proposal_edit_requests.proposal_id
    AND (sp.instructor_id = auth.uid() OR sp.created_by = auth.uid())
  ));

-- 2. Add availability columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS availability_days text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_windows text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_notes text;

-- 3. Add latest_edit_request_note and latest_edit_request_at to schedule_proposals
ALTER TABLE public.schedule_proposals
  ADD COLUMN IF NOT EXISTS latest_edit_request_note text,
  ADD COLUMN IF NOT EXISTS latest_edit_request_at timestamptz;
