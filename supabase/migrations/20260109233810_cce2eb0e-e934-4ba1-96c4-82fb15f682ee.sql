-- Create permits table for centralized permit management
CREATE TABLE public.permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  upload_source TEXT NOT NULL DEFAULT 'intake' CHECK (upload_source IN ('intake', 'chat', 'admin', 'profile', 'other')),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_status TEXT NOT NULL DEFAULT 'pending' CHECK (verified_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;

-- Admin/Staff can manage all permits
CREATE POLICY "Staff admin can manage all permits"
ON public.permits
FOR ALL
USING (is_staff_or_admin(auth.uid()));

-- Users can view their own permits
CREATE POLICY "Users can view own permits"
ON public.permits
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own permits
CREATE POLICY "Users can insert own permits"
ON public.permits
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_permits_user_id ON public.permits(user_id);
CREATE INDEX idx_permits_verified_status ON public.permits(verified_status);
CREATE INDEX idx_permits_uploaded_at ON public.permits(uploaded_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_permits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_permits_updated_at
BEFORE UPDATE ON public.permits
FOR EACH ROW
EXECUTE FUNCTION public.update_permits_updated_at();

-- Backfill existing permits from profiles table
INSERT INTO public.permits (user_id, file_url, file_name, upload_source, verified_status)
SELECT 
  id as user_id,
  permit_file_url as file_url,
  COALESCE(
    SUBSTRING(permit_file_url FROM '[^/]+$'),
    'permit-file'
  ) as file_name,
  'intake' as upload_source,
  CASE 
    WHEN approval_status = 'approved' THEN 'approved'
    ELSE 'pending'
  END as verified_status
FROM public.profiles
WHERE permit_file_url IS NOT NULL AND permit_file_url != '';