-- Helper: round timestamptz up to next 30-minute boundary
CREATE OR REPLACE FUNCTION public.round_up_to_30min(ts timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  mins int;
  rounded timestamptz;
BEGIN
  mins := extract(minute from ts)::int;
  IF mins = 0 OR mins = 30 THEN
    RETURN date_trunc('minute', ts);
  END IF;

  -- Round up to next 30-min boundary
  IF mins < 30 THEN
    rounded := date_trunc('hour', ts) + interval '30 minutes';
  ELSE
    rounded := date_trunc('hour', ts) + interval '1 hour';
  END IF;

  RETURN rounded;
END;
$$;

-- Trigger: enforce starts_at and ends_at always align to 30-min boundaries
CREATE OR REPLACE FUNCTION public.sessions_enforce_30min()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Ensure duration_minutes exists and is valid
  IF NEW.duration_minutes IS NULL OR NEW.duration_minutes <= 0 THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.ends_at - NEW.starts_at)) / 60;
    IF NEW.duration_minutes IS NULL OR NEW.duration_minutes <= 0 THEN
      RAISE EXCEPTION 'duration_minutes must be a positive integer';
    END IF;
  END IF;

  -- Force starts_at to 30-min boundary
  NEW.starts_at := public.round_up_to_30min(NEW.starts_at);

  -- Recompute ends_at from duration
  NEW.ends_at := NEW.starts_at + make_interval(mins => NEW.duration_minutes::int);

  -- Force ends_at to 30-min boundary too
  NEW.ends_at := public.round_up_to_30min(NEW.ends_at);

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_sessions_enforce_30min ON public.sessions;
CREATE TRIGGER trg_sessions_enforce_30min
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.sessions_enforce_30min();

-- Add duration_minutes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sessions' 
    AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN duration_minutes int;
  END IF;
END $$;

-- Update existing rows to have duration_minutes calculated from starts_at/ends_at
UPDATE public.sessions 
SET duration_minutes = EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60
WHERE duration_minutes IS NULL;