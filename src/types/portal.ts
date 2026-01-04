// Portal Types for DrivingKlass

export type UserRole = 'student' | 'instructor' | 'staff' | 'admin';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  email: string | null;
  approved: boolean | null;
  approval_status?: ApprovalStatus;
  rejection_reason?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
  avatar_url?: string | null;
  intake_submitted: boolean | null;
  public_id: string | null;
  phone: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  permit_number: string | null;
  permit_issue_date: string | null;
  permit_expiration_date: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  permit_file_url: string | null;
}

export interface Session {
  id: string;
  created_at: string;
  student_id: string;
  instructor_id: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  cancelled_at: string | null;
  cancelled_by_role: 'student' | 'instructor' | 'staff' | 'admin' | null;
  cancellation_reason: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  report_card_id: string | null;
  // Joined fields
  student?: Profile;
  instructor?: Profile;
}

export interface ReportCard {
  id: string;
  created_at: string;
  session_id: string;
  student_id: string;
  instructor_id: string;
  lesson_audio_url: string | null;
  transcription_summary: string | null;
  message_to_student: string | null;
  internal_message: string | null;
  acceleration: number | null;
  braking: number | null;
  left_turns: number | null;
  right_turns: number | null;
  speed_maintenance: number | null;
  lane_maintenance: number | null;
  blind_spots: number | null;
  signal_usage: number | null;
  changing_lanes: number | null;
  following_distance: number | null;
  road_sign_awareness: number | null;
  distractions: number | null;
  general_parking: number | null;
  reverse_parking: number | null;
  parallel_parking: number | null;
  straight_line_backing: number | null;
  turn_about: number | null;
  merging: number | null;
  interstate: number | null;
  overall: number | null;
  // Joined fields
  student?: Profile;
  instructor?: Profile;
  session?: Session;
}

export interface InstructorStudent {
  id: string;
  instructor_id: string;
  student_id: string;
  created_at: string;
  student?: Profile;
  instructor?: Profile;
}

export interface InternalNote {
  id: string;
  created_at: string;
  target_user_id: string;
  created_by: string;
  note: string;
  creator?: Profile;
}

export type NotificationType = 
  | 'approval' 
  | 'rejection' 
  | 'schedule' 
  | 'report_card' 
  | 'message' 
  | 'system' 
  | 'payment' 
  | 'reminder'
  | 'session_scheduled'
  | 'session_updated'
  | 'session_cancelled'
  | 'report_card_posted'
  | 'intake_submitted';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  read_at: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  link: string | null;
  metadata: Record<string, unknown> | null;
}

export const RATING_CATEGORIES = [
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'braking', label: 'Braking' },
  { key: 'left_turns', label: 'Left Turns' },
  { key: 'right_turns', label: 'Right Turns' },
  { key: 'speed_maintenance', label: 'Speed Maintenance' },
  { key: 'lane_maintenance', label: 'Lane Maintenance' },
  { key: 'blind_spots', label: 'Blind Spots' },
  { key: 'signal_usage', label: 'Signal Usage' },
  { key: 'changing_lanes', label: 'Changing Lanes' },
  { key: 'following_distance', label: 'Following Distance' },
  { key: 'road_sign_awareness', label: 'Road Sign Awareness' },
  { key: 'distractions', label: 'Distractions' },
  { key: 'general_parking', label: 'General Parking' },
  { key: 'reverse_parking', label: 'Reverse Parking' },
  { key: 'parallel_parking', label: 'Parallel Parking' },
  { key: 'straight_line_backing', label: 'Straight Line Backing' },
  { key: 'turn_about', label: 'Turn About' },
  { key: 'merging', label: 'Merging' },
  { key: 'interstate', label: 'Interstate' },
  { key: 'overall', label: 'Overall' },
] as const;
