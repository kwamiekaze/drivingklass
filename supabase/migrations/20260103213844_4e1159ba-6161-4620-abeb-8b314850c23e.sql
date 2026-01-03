-- Create leads table with ONLY student profile fields
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Student profile fields ONLY
  full_name text,
  email text,
  phone text,
  permit_number text,
  permit_issue_date date,
  permit_expiration_date date,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  home_address text,
  pickup_locations text,
  raw_text text
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Only staff/admin can manage leads
CREATE POLICY "Staff admin can manage leads"
  ON public.leads
  FOR ALL
  USING (is_staff_or_admin(auth.uid()));

-- Create lead_notes table
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text NOT NULL,
  is_pinned boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Only staff/admin can manage lead notes
CREATE POLICY "Staff admin can manage lead notes"
  ON public.lead_notes
  FOR ALL
  USING (is_staff_or_admin(auth.uid()));

-- Create indexes for leads
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_full_name ON public.leads(full_name);

-- Create index for lead notes
CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);