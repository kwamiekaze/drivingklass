-- Add last_sign_in_at column to profiles for tracking user login times
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.last_sign_in_at IS 'Updated on each successful login';