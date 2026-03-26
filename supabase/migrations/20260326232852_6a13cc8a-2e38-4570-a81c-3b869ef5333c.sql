-- Add suppress_student_notification column to sessions
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS suppress_student_notification boolean NOT NULL DEFAULT false;

-- Update the notify_session_participants function to respect suppression
CREATE OR REPLACE FUNCTION public.notify_session_participants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_suppress_student boolean;
BEGIN
  -- Check if student notification should be suppressed
  v_suppress_student := COALESCE(NEW.suppress_student_notification, false);

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
  
  -- Generate dedupe keys
  v_dedupe_student := NEW.id || ':' || v_event_type || ':' || NEW.student_id || ':' || date_trunc('minute', NOW());
  v_dedupe_instructor := NEW.id || ':' || v_event_type || ':' || NEW.instructor_id || ':' || date_trunc('minute', NOW());
  
  -- Insert notification for student ONLY if not suppressed
  IF NOT v_suppress_student THEN
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
  END IF;
  
  -- Insert notification for instructor (always)
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
$function$;