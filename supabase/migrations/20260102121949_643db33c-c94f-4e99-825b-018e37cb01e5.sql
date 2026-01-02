-- Create analytics_sessions table
CREATE TABLE public.analytics_sessions (
  session_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_path TEXT,
  last_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  device_type TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create analytics_events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  event_name TEXT,
  path TEXT,
  page_title TEXT,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB
);

-- Enable RLS on both tables
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
-- Admins can view all events
CREATE POLICY "Admins can view analytics events"
ON public.analytics_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Public insert policy - anyone can insert events
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- RLS Policies for analytics_sessions
-- Admins can view all sessions
CREATE POLICY "Admins can view analytics sessions"
ON public.analytics_sessions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Public insert and update for sessions (via tracking)
CREATE POLICY "Anyone can insert analytics sessions"
ON public.analytics_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update analytics sessions"
ON public.analytics_sessions
FOR UPDATE
USING (true);

-- Create indexes for performance
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_path_created ON public.analytics_events(path, created_at);
CREATE INDEX idx_analytics_events_session_created ON public.analytics_events(session_id, created_at);
CREATE INDEX idx_analytics_events_event_type_created ON public.analytics_events(event_type, created_at);
CREATE INDEX idx_analytics_sessions_created_at ON public.analytics_sessions(created_at);
CREATE INDEX idx_analytics_sessions_last_seen ON public.analytics_sessions(last_seen_at);