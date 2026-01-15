-- Add hours_remaining to profiles for student hours tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hours_remaining numeric NOT NULL DEFAULT 0;

-- Add hours_deducted_at to sessions for tracking deduction
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS hours_deducted_at timestamptz;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.hours_remaining IS 'Remaining lesson hours for student packages';
COMMENT ON COLUMN public.sessions.hours_deducted_at IS 'Timestamp when hours were deducted from student balance';