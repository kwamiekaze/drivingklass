// Lead Types for DrivingKlass

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';

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
}
