ALTER TABLE public.schedule_proposal_items
  ADD COLUMN IF NOT EXISTS dds_location text,
  ADD COLUMN IF NOT EXISTS pickup_time time without time zone;