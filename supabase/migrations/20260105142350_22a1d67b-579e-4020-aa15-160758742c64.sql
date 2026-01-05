-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
ADD COLUMN IF NOT EXISTS link text,
ADD COLUMN IF NOT EXISTS metadata jsonb,
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS report_card_id uuid REFERENCES public.report_cards(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_key_idx ON public.notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Create function to send session notifications
CREATE OR REPLACE FUNCTION public.notify_session_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
  v_instructor_name text;
  v_session_date text;
  v_session_time text;
  v_event_type text;
  v_student_title text;
  v_student_message text;
  v_instructor_title text;
  v_instructor_message text;
  v_dedupe_student text;
  v_dedupe_instructor text;
BEGIN
  -- Get display names
  SELECT COALESCE(full_name, first_name || ' ' || last_name, email, 'Student') INTO v_student_name
  FROM profiles WHERE id = NEW.student_id;
  
  SELECT COALESCE(full_name, first_name || ' ' || last_name, email, 'Instructor') INTO v_instructor_name
  FROM profiles WHERE id = NEW.instructor_id;
  
  -- Format date and time
  v_session_date := to_char(NEW.starts_at AT TIME ZONE 'America/New_York', 'Mon DD, YYYY');
  v_session_time := to_char(NEW.starts_at AT TIME ZONE 'America/New_York', 'HH12:MI AM');
  
  -- Determine event type and messages
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'session_created';
    v_student_title := 'New Session Scheduled';
    v_student_message := format('You have a session scheduled on %s at %s with %s.', v_session_date, v_session_time, v_instructor_name);
    v_instructor_title := 'New Session Assigned';
    v_instructor_message := format('You have been assigned a session on %s at %s with %s.', v_session_date, v_session_time, v_student_name);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      v_event_type := 'session_cancelled';
      v_student_title := 'Session Cancelled';
      v_student_message := format('Your session on %s at %s has been cancelled.%s', 
        v_session_date, v_session_time, 
        CASE WHEN NEW.cancellation_reason IS NOT NULL THEN ' Reason: ' || NEW.cancellation_reason ELSE '' END);
      v_instructor_title := 'Session Cancelled';
      v_instructor_message := format('The session on %s at %s with %s has been cancelled.%s', 
        v_session_date, v_session_time, v_student_name,
        CASE WHEN NEW.cancellation_reason IS NOT NULL THEN ' Reason: ' || NEW.cancellation_reason ELSE '' END);
        
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      v_event_type := 'session_completed';
      v_student_title := 'Session Completed';
      v_student_message := format('Your session on %s has been marked as completed.', v_session_date);
      v_instructor_title := 'Session Completed';
      v_instructor_message := format('Session with %s on %s has been marked as completed.', v_student_name, v_session_date);
      
    ELSIF (NEW.starts_at != OLD.starts_at OR NEW.ends_at != OLD.ends_at) AND NEW.status = 'scheduled' THEN
      v_event_type := 'session_rescheduled';
      v_student_title := 'Session Rescheduled';
      v_student_message := format('Your session has been rescheduled to %s at %s with %s.', v_session_date, v_session_time, v_instructor_name);
      v_instructor_title := 'Session Rescheduled';
      v_instructor_message := format('Session with %s has been rescheduled to %s at %s.', v_student_name, v_session_date, v_session_time);
      
    ELSIF (NEW.student_id != OLD.student_id OR NEW.instructor_id != OLD.instructor_id) AND NEW.status = 'scheduled' THEN
      v_event_type := 'session_assigned';
      v_student_title := 'Session Assigned';
      v_student_message := format('You have been assigned to a session on %s at %s with %s.', v_session_date, v_session_time, v_instructor_name);
      v_instructor_title := 'Student Assigned';
      v_instructor_message := format('%s has been assigned to your session on %s at %s.', v_student_name, v_session_date, v_session_time);
    ELSE
      -- No notification-worthy change
      RETURN NEW;
    END IF;
  END IF;
  
  -- Generate dedupe keys (session_id:event_type:user_id:date)
  v_dedupe_student := NEW.id || ':' || v_event_type || ':' || NEW.student_id || ':' || date_trunc('minute', NEW.updated_at);
  v_dedupe_instructor := NEW.id || ':' || v_event_type || ':' || NEW.instructor_id || ':' || date_trunc('minute', NEW.updated_at);
  
  -- Insert notification for student (skip if already exists)
  INSERT INTO notifications (user_id, title, message, type, severity, session_id, link, dedupe_key)
  VALUES (
    NEW.student_id,
    v_student_title,
    v_student_message,
    v_event_type,
    CASE WHEN v_event_type = 'session_cancelled' THEN 'warning' ELSE 'info' END,
    NEW.id,
    '/student',
    v_dedupe_student
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  
  -- Insert notification for instructor (skip if already exists)
  INSERT INTO notifications (user_id, title, message, type, severity, session_id, link, dedupe_key)
  VALUES (
    NEW.instructor_id,
    v_instructor_title,
    v_instructor_message,
    v_event_type,
    CASE WHEN v_event_type = 'session_cancelled' THEN 'warning' ELSE 'info' END,
    NEW.id,
    '/instructor',
    v_dedupe_instructor
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for session notifications
DROP TRIGGER IF EXISTS session_notifications_trigger ON public.sessions;
CREATE TRIGGER session_notifications_trigger
  AFTER INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_session_participants();