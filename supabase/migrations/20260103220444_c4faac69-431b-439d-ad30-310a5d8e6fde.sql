-- Add status column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Add notes column to leads table for quick notes
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes text;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Create index on full_name for search
CREATE INDEX IF NOT EXISTS idx_leads_full_name ON public.leads(full_name);

-- Verify lead_notes table exists and has proper structure
-- (it should already exist from previous migration)