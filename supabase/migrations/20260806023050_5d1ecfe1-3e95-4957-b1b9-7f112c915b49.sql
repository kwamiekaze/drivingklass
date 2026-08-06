ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'session_scheduled','session_updated','session_cancelled','report_card_posted','intake_submitted',
  'session_created','session_completed','session_rescheduled','session_assigned','approval','rejection',
  'schedule','report_card','message','system','session_partially_completed','report_card_viewed'
]));