-- Add new columns to leads table for DOB, age, pipeline status, follow-up, and conversion tracking
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS converted_student_id uuid;

-- Create lead_activity table for audit logging
CREATE TABLE IF NOT EXISTS public.lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb
);

-- Enable RLS on lead_activity
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

-- RLS policy: Staff/Admin can view activity logs
CREATE POLICY "Staff admin can view lead activity"
  ON public.lead_activity
  FOR SELECT
  USING (is_staff_or_admin(auth.uid()));

-- RLS policy: Staff/Admin can insert activity logs
CREATE POLICY "Staff admin can insert lead activity"
  ON public.lead_activity
  FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON public.leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON public.leads(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_dob ON public.leads(dob);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_permit_number ON public.leads(permit_number);
CREATE INDEX IF NOT EXISTS idx_leads_permit_issue_date ON public.leads(permit_issue_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id ON public.lead_activity(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();