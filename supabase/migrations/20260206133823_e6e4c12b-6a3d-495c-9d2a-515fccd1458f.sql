
-- Add cancellation penalty tracking columns to sessions
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS cancel_penalty_applied boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cancel_penalty_hours numeric NOT NULL DEFAULT 0;
