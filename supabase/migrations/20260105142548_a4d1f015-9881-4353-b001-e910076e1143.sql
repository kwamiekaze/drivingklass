-- Drop old check constraint and add new one with all types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'session_scheduled'::text,
    'session_updated'::text,
    'session_cancelled'::text,
    'report_card_posted'::text,
    'intake_submitted'::text,
    'session_created'::text,
    'session_completed'::text,
    'session_rescheduled'::text,
    'session_assigned'::text,
    'approval'::text,
    'rejection'::text,
    'schedule'::text,
    'report_card'::text,
    'message'::text,
    'system'::text
  ])
);