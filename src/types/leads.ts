// Lead Types for DrivingKlass

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';
export type LeadPipelineStatus = 'New' | 'Contacted' | 'Scheduled' | 'Converted' | 'Cold';
export type LeadSourceType = 'manual' | 'screenshot' | 'paste';

export interface Lead {
  id: string;
  created_at: string;
  created_by: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  permit_number: string | null;
  permit_issue_date: string | null;
  permit_expiration_date: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  home_address: string | null;
  pickup_locations: string | null;
  raw_text: string | null;
  status: LeadStatus | null;
  notes: string | null;
  // New fields
  dob: string | null;
  age: number | null;
  lead_status: LeadPipelineStatus | null;
  next_follow_up_at: string | null;
  updated_at: string | null;
  converted_student_id: string | null;
  // Screenshot-based lead fields
  source_type: LeadSourceType | null;
  attachment_path: string | null;
  attachment_bucket: string | null;
  // Imported roster source fields
  start_date: string | null;
  import_source: string | null;
  import_key: string | null;
}

export interface LeadNote {
  id: string;
  created_at: string;
  lead_id: string;
  author_id: string | null;
  note: string;
  is_pinned: boolean;
  author?: {
    full_name: string | null;
  };
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  created_at: string;
  actor_user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  actor?: {
    full_name: string | null;
  };
}

export interface ParsedLeadData {
  full_name: string;
  email: string;
  phone: string;
  permit_number: string;
  permit_issue_date: string;
  permit_expiration_date: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  home_address: string;
  pickup_locations: string;
  dob: string;
  age: number | null;
}

/** Row shape returned by the admin_search_leads RPC (admin/staff only). */
export interface ImportedLeadRow {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  guardian_name: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  start_date: string | null;
  source_page: number | null;
  source_index: number | null;
  import_source: string | null;
  import_key: string | null;
  source_status: string | null;
  source_location: string | null;
  source_zone: string | null;
  source_account_created_on: string | null;
  lead_status: string | null;
  notes: string | null;
  total_count: number;
}
