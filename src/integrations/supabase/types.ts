export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          device_type: string | null
          event_name: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          page_title: string | null
          path: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_name?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          page_title?: string | null
          path?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_name?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          page_title?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          duration_seconds: number
          first_path: string | null
          last_path: string | null
          last_seen_at: string
          page_count: number
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          duration_seconds?: number
          first_path?: string | null
          last_path?: string | null
          last_seen_at?: string
          page_count?: number
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          duration_seconds?: number
          first_path?: string | null
          last_path?: string | null
          last_seen_at?: string
          page_count?: number
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approved_intakes: {
        Row: {
          approved_at: string
          approved_by: string | null
          created_at: string
          files: Json | null
          id: string
          intake_submission_id: string | null
          pdf_path: string | null
          snapshot_json: Json
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          files?: Json | null
          id?: string
          intake_submission_id?: string | null
          pdf_path?: string | null
          snapshot_json: Json
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          files?: Json | null
          id?: string
          intake_submission_id?: string | null
          pdf_path?: string | null
          snapshot_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_intakes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_intakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          status: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          status?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          status?: string | null
        }
        Relationships: []
      }
      instructor_students: {
        Row: {
          created_at: string | null
          id: string
          instructor_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructor_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instructor_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_students_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          note: string
          target_user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          note: string
          target_user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          note?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          lead_id: string
          note: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id: string
          note: string
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          age: number | null
          converted_student_id: string | null
          created_at: string | null
          created_by: string | null
          dob: string | null
          email: string | null
          full_name: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          home_address: string | null
          id: string
          lead_status: string | null
          next_follow_up_at: string | null
          notes: string | null
          permit_expiration_date: string | null
          permit_issue_date: string | null
          permit_number: string | null
          phone: string | null
          pickup_locations: string | null
          raw_text: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          converted_student_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          home_address?: string | null
          id?: string
          lead_status?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          permit_expiration_date?: string | null
          permit_issue_date?: string | null
          permit_number?: string | null
          phone?: string | null
          pickup_locations?: string | null
          raw_text?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          converted_student_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          home_address?: string | null
          id?: string
          lead_status?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          permit_expiration_date?: string | null
          permit_issue_date?: string | null
          permit_number?: string | null
          phone?: string | null
          pickup_locations?: string | null
          raw_text?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      media_uploads: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          dropoff_address: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          intake_submitted: boolean | null
          last_name: string | null
          permit_expiration_date: string | null
          permit_file_url: string | null
          permit_issue_date: string | null
          permit_number: string | null
          phone: string | null
          pickup_address: string | null
          public_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          dropoff_address?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id: string
          intake_submitted?: boolean | null
          last_name?: string | null
          permit_expiration_date?: string | null
          permit_file_url?: string | null
          permit_issue_date?: string | null
          permit_number?: string | null
          phone?: string | null
          pickup_address?: string | null
          public_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          dropoff_address?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          intake_submitted?: boolean | null
          last_name?: string | null
          permit_expiration_date?: string | null
          permit_file_url?: string | null
          permit_issue_date?: string | null
          permit_number?: string | null
          phone?: string | null
          pickup_address?: string | null
          public_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          acceleration: number | null
          blind_spots: number | null
          braking: number | null
          changing_lanes: number | null
          created_at: string | null
          distractions: number | null
          following_distance: number | null
          general_parking: number | null
          id: string
          instructor_id: string
          internal_message: string | null
          interstate: number | null
          lane_maintenance: number | null
          left_turns: number | null
          lesson_audio_url: string | null
          merging: number | null
          message_to_student: string | null
          overall: number | null
          parallel_parking: number | null
          reverse_parking: number | null
          right_turns: number | null
          road_sign_awareness: number | null
          session_id: string
          signal_usage: number | null
          speed_maintenance: number | null
          straight_line_backing: number | null
          student_id: string
          transcription_summary: string | null
          turn_about: number | null
        }
        Insert: {
          acceleration?: number | null
          blind_spots?: number | null
          braking?: number | null
          changing_lanes?: number | null
          created_at?: string | null
          distractions?: number | null
          following_distance?: number | null
          general_parking?: number | null
          id?: string
          instructor_id: string
          internal_message?: string | null
          interstate?: number | null
          lane_maintenance?: number | null
          left_turns?: number | null
          lesson_audio_url?: string | null
          merging?: number | null
          message_to_student?: string | null
          overall?: number | null
          parallel_parking?: number | null
          reverse_parking?: number | null
          right_turns?: number | null
          road_sign_awareness?: number | null
          session_id: string
          signal_usage?: number | null
          speed_maintenance?: number | null
          straight_line_backing?: number | null
          student_id: string
          transcription_summary?: string | null
          turn_about?: number | null
        }
        Update: {
          acceleration?: number | null
          blind_spots?: number | null
          braking?: number | null
          changing_lanes?: number | null
          created_at?: string | null
          distractions?: number | null
          following_distance?: number | null
          general_parking?: number | null
          id?: string
          instructor_id?: string
          internal_message?: string | null
          interstate?: number | null
          lane_maintenance?: number | null
          left_turns?: number | null
          lesson_audio_url?: string | null
          merging?: number | null
          message_to_student?: string | null
          overall?: number | null
          parallel_parking?: number | null
          reverse_parking?: number | null
          right_turns?: number | null
          road_sign_awareness?: number | null
          session_id?: string
          signal_usage?: number | null
          speed_maintenance?: number | null
          straight_line_backing?: number | null
          student_id?: string
          transcription_summary?: string | null
          turn_about?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          price: string
          square_link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          price: string
          square_link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          price?: string
          square_link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_role: string | null
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          ends_at: string
          id: string
          instructor_id: string
          report_card_id: string | null
          starts_at: string
          status: string | null
          student_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_role?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          ends_at: string
          id?: string
          instructor_id: string
          report_card_id?: string | null
          starts_at: string
          status?: string | null
          student_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_role?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          ends_at?: string
          id?: string
          instructor_id?: string
          report_card_id?: string | null
          starts_at?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_report_card"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "report_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_instructor: {
        Args: { _instructor_id: string; _student_id: string }
        Returns: boolean
      }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "student" | "instructor" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "student", "instructor", "staff"],
    },
  },
} as const
