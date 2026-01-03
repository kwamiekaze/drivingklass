-- Extend profiles table with portal fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS intake_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_id text UNIQUE,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS pickup_address text,
ADD COLUMN IF NOT EXISTS dropoff_address text,
ADD COLUMN IF NOT EXISTS permit_number text,
ADD COLUMN IF NOT EXISTS permit_issue_date date,
ADD COLUMN IF NOT EXISTS permit_expiration_date date,
ADD COLUMN IF NOT EXISTS guardian_name text,
ADD COLUMN IF NOT EXISTS guardian_phone text,
ADD COLUMN IF NOT EXISTS guardian_email text,
ADD COLUMN IF NOT EXISTS permit_file_url text;

-- Create instructor_students assignment table
CREATE TABLE IF NOT EXISTS public.instructor_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(instructor_id, student_id)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
  cancelled_at timestamptz,
  cancelled_by_role text CHECK (cancelled_by_role IN ('student', 'instructor', 'staff', 'admin')),
  cancellation_reason text,
  completed boolean DEFAULT false,
  report_card_id uuid,
  CONSTRAINT ends_at_30_min CHECK (ends_at = starts_at + interval '30 minutes')
);

-- Create report_cards table
CREATE TABLE IF NOT EXISTS public.report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_audio_url text,
  transcription_summary text,
  message_to_student text,
  internal_message text,
  acceleration int CHECK (acceleration BETWEEN 1 AND 10),
  braking int CHECK (braking BETWEEN 1 AND 10),
  left_turns int CHECK (left_turns BETWEEN 1 AND 10),
  right_turns int CHECK (right_turns BETWEEN 1 AND 10),
  speed_maintenance int CHECK (speed_maintenance BETWEEN 1 AND 10),
  lane_maintenance int CHECK (lane_maintenance BETWEEN 1 AND 10),
  blind_spots int CHECK (blind_spots BETWEEN 1 AND 10),
  signal_usage int CHECK (signal_usage BETWEEN 1 AND 10),
  changing_lanes int CHECK (changing_lanes BETWEEN 1 AND 10),
  following_distance int CHECK (following_distance BETWEEN 1 AND 10),
  road_sign_awareness int CHECK (road_sign_awareness BETWEEN 1 AND 10),
  distractions int CHECK (distractions BETWEEN 1 AND 10),
  general_parking int CHECK (general_parking BETWEEN 1 AND 10),
  reverse_parking int CHECK (reverse_parking BETWEEN 1 AND 10),
  parallel_parking int CHECK (parallel_parking BETWEEN 1 AND 10),
  straight_line_backing int CHECK (straight_line_backing BETWEEN 1 AND 10),
  turn_about int CHECK (turn_about BETWEEN 1 AND 10),
  merging int CHECK (merging BETWEEN 1 AND 10),
  interstate int CHECK (interstate BETWEEN 1 AND 10),
  overall int CHECK (overall BETWEEN 1 AND 10)
);

-- Add foreign key from sessions to report_cards
ALTER TABLE public.sessions 
ADD CONSTRAINT fk_report_card 
FOREIGN KEY (report_card_id) REFERENCES public.report_cards(id) ON DELETE SET NULL;

-- Create internal_notes table
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  type text CHECK (type IN ('session_scheduled', 'session_updated', 'session_cancelled', 'report_card_posted', 'intake_submitted'))
);

-- Enable RLS on all new tables
ALTER TABLE public.instructor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Helper function to check if user is staff or admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role IN ('staff', 'admin')
  )
$$;

-- Helper function to check if instructor is assigned to student
CREATE OR REPLACE FUNCTION public.is_assigned_instructor(_instructor_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_students 
    WHERE instructor_id = _instructor_id 
    AND student_id = _student_id
  )
$$;

-- Drop existing profile policies that need updating
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- PROFILES RLS POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff and admin can view all profiles" ON public.profiles
FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can view assigned students" ON public.profiles
FOR SELECT USING (
  public.has_role(auth.uid(), 'instructor') AND
  public.is_assigned_instructor(auth.uid(), id)
);

CREATE POLICY "Students can view assigned instructor" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.instructor_students 
    WHERE student_id = auth.uid() 
    AND instructor_id = profiles.id
  )
);

CREATE POLICY "Users can update own intake fields" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Staff admin can update any profile" ON public.profiles
FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));

-- INSTRUCTOR_STUDENTS RLS POLICIES
CREATE POLICY "Staff admin can manage assignments" ON public.instructor_students
FOR ALL USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can view own assignments" ON public.instructor_students
FOR SELECT USING (instructor_id = auth.uid());

CREATE POLICY "Students can view own assignment" ON public.instructor_students
FOR SELECT USING (student_id = auth.uid());

-- SESSIONS RLS POLICIES
CREATE POLICY "Students can view own sessions" ON public.sessions
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors can view own sessions" ON public.sessions
FOR SELECT USING (instructor_id = auth.uid());

CREATE POLICY "Staff admin can view all sessions" ON public.sessions
FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff admin can manage all sessions" ON public.sessions
FOR ALL USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Participants can cancel own sessions" ON public.sessions
FOR UPDATE USING (
  (student_id = auth.uid() OR instructor_id = auth.uid()) 
  AND status = 'scheduled'
);

-- REPORT_CARDS RLS POLICIES
CREATE POLICY "Students can view own report cards" ON public.report_cards
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors can manage own report cards" ON public.report_cards
FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Staff admin can manage all report cards" ON public.report_cards
FOR ALL USING (public.is_staff_or_admin(auth.uid()));

-- INTERNAL_NOTES RLS POLICIES
CREATE POLICY "Staff admin can manage internal notes" ON public.internal_notes
FOR ALL USING (public.is_staff_or_admin(auth.uid()));

-- NOTIFICATIONS RLS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Staff admin can manage notifications" ON public.notifications
FOR ALL USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Trigger to set session completed when report card is created
CREATE OR REPLACE FUNCTION public.on_report_card_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions 
  SET completed = true, 
      status = 'completed',
      report_card_id = NEW.id
  WHERE id = NEW.session_id;
  
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.student_id,
    'New Report Card',
    'Your instructor has submitted a report card for your lesson.',
    'report_card_posted'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_card_insert ON public.report_cards;
CREATE TRIGGER on_report_card_insert
AFTER INSERT ON public.report_cards
FOR EACH ROW
EXECUTE FUNCTION public.on_report_card_created();

-- Trigger to assign student role on new user
CREATE OR REPLACE FUNCTION public.assign_student_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;
CREATE TRIGGER on_profile_created_assign_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_student_role_on_signup();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_instructor_id ON public.sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_starts_at ON public.sessions(starts_at);
CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON public.report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_session_id ON public.report_cards(session_id);
CREATE INDEX IF NOT EXISTS idx_instructor_students_instructor ON public.instructor_students(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_students_student ON public.instructor_students(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_target ON public.internal_notes(target_user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('permits', 'permits', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-audio', 'lesson-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for permits bucket
CREATE POLICY "Students can upload own permits" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'permits' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view own permits" ON storage.objects
FOR SELECT USING (
  bucket_id = 'permits' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Staff admin can view all permits" ON storage.objects
FOR SELECT USING (
  bucket_id = 'permits' AND 
  public.is_staff_or_admin(auth.uid())
);

-- Storage policies for lesson-audio bucket
CREATE POLICY "Instructors can upload lesson audio" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'lesson-audio' AND 
  public.has_role(auth.uid(), 'instructor')
);

CREATE POLICY "Session participants can view audio" ON storage.objects
FOR SELECT USING (
  bucket_id = 'lesson-audio' AND (
    public.is_staff_or_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE id::text = (storage.foldername(name))[1]
      AND (student_id = auth.uid() OR instructor_id = auth.uid())
    )
  )
);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;