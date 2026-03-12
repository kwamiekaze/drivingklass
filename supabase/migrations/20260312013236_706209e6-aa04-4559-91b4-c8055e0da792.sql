
-- Schedule Proposals
CREATE TABLE public.schedule_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_by_role text NOT NULL DEFAULT 'instructor',
  proposal_status text NOT NULL DEFAULT 'sent',
  acceptance_mode text NOT NULL DEFAULT 'pending_admin_finalize',
  note_to_student text,
  expires_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Schedule Proposal Items
CREATE TABLE public.schedule_proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.schedule_proposals(id) ON DELETE CASCADE,
  proposed_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 120,
  session_type text NOT NULL DEFAULT 'driving',
  pickup_address text,
  dropoff_address text,
  item_status text NOT NULL DEFAULT 'proposed',
  conflict_reason text,
  created_session_id uuid REFERENCES public.sessions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_proposal_items ENABLE ROW LEVEL SECURITY;

-- RLS for schedule_proposals
CREATE POLICY "Staff admin can manage all proposals"
  ON public.schedule_proposals FOR ALL
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can manage own proposals"
  ON public.schedule_proposals FOR ALL
  USING (instructor_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Students can view own proposals"
  ON public.schedule_proposals FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update own proposals for acceptance"
  ON public.schedule_proposals FOR UPDATE
  USING (student_id = auth.uid());

-- RLS for schedule_proposal_items
CREATE POLICY "Staff admin can manage all proposal items"
  ON public.schedule_proposal_items FOR ALL
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can manage items of own proposals"
  ON public.schedule_proposal_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.schedule_proposals sp
    WHERE sp.id = schedule_proposal_items.proposal_id
    AND (sp.instructor_id = auth.uid() OR sp.created_by = auth.uid())
  ));

CREATE POLICY "Students can view items of own proposals"
  ON public.schedule_proposal_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.schedule_proposals sp
    WHERE sp.id = schedule_proposal_items.proposal_id
    AND sp.student_id = auth.uid()
  ));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_proposals
  BEFORE UPDATE ON public.schedule_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_proposal_items
  BEFORE UPDATE ON public.schedule_proposal_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
