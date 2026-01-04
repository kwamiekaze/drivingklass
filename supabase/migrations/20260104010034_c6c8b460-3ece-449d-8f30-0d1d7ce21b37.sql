-- Add missing approval columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by uuid NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejected_by uuid NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);

-- Update existing approved users to have approval_status = 'approved'
UPDATE public.profiles SET approval_status = 'approved' WHERE approved = true AND approval_status = 'pending';

-- Add constraint to validate approval_status values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));