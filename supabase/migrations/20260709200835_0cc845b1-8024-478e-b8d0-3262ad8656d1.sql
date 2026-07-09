
-- Add DDS testing location to sessions (nullable — only used when session_type = 'testing')
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS dds_location TEXT;

-- Sent-email log specifically for road test scheduling notifications.
CREATE TABLE IF NOT EXISTS public.road_test_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student','instructor')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);

GRANT SELECT, INSERT ON public.road_test_emails TO authenticated;
GRANT ALL ON public.road_test_emails TO service_role;

ALTER TABLE public.road_test_emails ENABLE ROW LEVEL SECURITY;

-- Admin/staff can view all
CREATE POLICY "Staff can view all road test emails"
  ON public.road_test_emails FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Instructor can view emails for their sessions
CREATE POLICY "Instructor can view emails for their sessions"
  ON public.road_test_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sessions s
      WHERE s.id = road_test_emails.session_id
        AND s.instructor_id = auth.uid())
  );

-- Insertion done by service role only in practice (edge function). Deny direct
-- inserts by regular authenticated clients.
CREATE POLICY "Service role only insert"
  ON public.road_test_emails FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_road_test_emails_session ON public.road_test_emails(session_id);
