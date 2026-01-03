import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadActivity, LeadPipelineStatus } from '@/types/leads';
import { format } from 'date-fns';

// ============= Activity Logging =============

export async function logLeadActivity(
  leadId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  
  // Using type assertion since types file may not be regenerated yet
  await (supabase.from('lead_activity') as any).insert({
    lead_id: leadId,
    actor_user_id: userData?.user?.id || null,
    action,
    details: details || null,
  });
}

// ============= Fetch Activity =============

export async function fetchLeadActivity(leadId: string): Promise<LeadActivity[]> {
  // Using type assertion since types file may not be regenerated yet
  const { data } = await (supabase.from('lead_activity') as any)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!data) return [];

  // Fetch actor names
  const activitiesWithActors = await Promise.all(
    (data as any[]).map(async (activity) => {
      let actorName: string | null = null;
      if (activity.actor_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', activity.actor_user_id)
          .maybeSingle();
        actorName = profile?.full_name || null;
      }
      return {
        ...activity,
        actor: { full_name: actorName }
      } as LeadActivity;
    })
  );

  return activitiesWithActors;
}

// ============= CSV Export =============

export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    'Full Name',
    'Email',
    'Phone',
    'DOB',
    'Age',
    'Permit #',
    'Permit Issue Date',
    'Permit Expiration Date',
    'Parent Name',
    'Parent Phone',
    'Parent Email',
    'Home Address',
    'Pickup Locations',
    'Status',
    'Next Follow-up',
    'Created At',
  ];

  const rows = leads.map(lead => [
    lead.full_name || '',
    lead.email || '',
    lead.phone || '',
    lead.dob ? format(new Date(lead.dob), 'MM/dd/yyyy') : '',
    lead.age?.toString() || '',
    lead.permit_number || '',
    lead.permit_issue_date ? format(new Date(lead.permit_issue_date), 'MM/dd/yyyy') : '',
    lead.permit_expiration_date ? format(new Date(lead.permit_expiration_date), 'MM/dd/yyyy') : '',
    lead.guardian_name || '',
    lead.guardian_phone || '',
    lead.guardian_email || '',
    (lead.home_address || '').replace(/[\n\r]/g, ' '),
    (lead.pickup_locations || '').replace(/[\n\r]/g, ' | '),
    lead.lead_status || lead.status || '',
    lead.next_follow_up_at ? format(new Date(lead.next_follow_up_at), 'MM/dd/yyyy h:mm a') : '',
    lead.created_at ? format(new Date(lead.created_at), 'MM/dd/yyyy h:mm a') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `leads_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============= Copy Lead Info =============

export function copyLeadInfo(lead: Lead): string {
  const lines = [
    `Name: ${lead.full_name || 'N/A'}`,
    `Email: ${lead.email || 'N/A'}`,
    `Phone: ${lead.phone || 'N/A'}`,
  ];

  if (lead.dob) {
    lines.push(`DOB: ${format(new Date(lead.dob), 'MM/dd/yyyy')} (${lead.age || 'N/A'} years old)`);
  }

  if (lead.permit_number) {
    lines.push(`Permit #: ${lead.permit_number}`);
  }

  if (lead.permit_issue_date) {
    lines.push(`Permit Issue: ${format(new Date(lead.permit_issue_date), 'MM/dd/yyyy')}`);
  }

  if (lead.permit_expiration_date) {
    lines.push(`Permit Expires: ${format(new Date(lead.permit_expiration_date), 'MM/dd/yyyy')}`);
  }

  if (lead.guardian_name || lead.guardian_phone || lead.guardian_email) {
    lines.push('');
    lines.push('--- Parent/Guardian ---');
    if (lead.guardian_name) lines.push(`Name: ${lead.guardian_name}`);
    if (lead.guardian_phone) lines.push(`Phone: ${lead.guardian_phone}`);
    if (lead.guardian_email) lines.push(`Email: ${lead.guardian_email}`);
  }

  if (lead.home_address) {
    lines.push('');
    lines.push(`Home Address: ${lead.home_address}`);
  }

  if (lead.pickup_locations) {
    lines.push(`Pickup: ${lead.pickup_locations.replace(/\n/g, ', ')}`);
  }

  return lines.join('\n');
}

// ============= Convert Lead to Student =============

export async function convertLeadToStudent(lead: Lead): Promise<{ success: boolean; studentId?: string; error?: string }> {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if lead is already converted
    if (lead.converted_student_id) {
      return { success: false, error: 'Lead has already been converted' };
    }

    // First, we need to create an auth user for the student
    // Since we can't create auth users from client, we'll create just a profile
    // This approach respects the existing approval workflow
    
    // For now, we'll just update the lead status and log the activity
    // The actual student creation would require an edge function or manual process
    
    // Update lead status
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        lead_status: 'Converted' as LeadPipelineStatus,
      })
      .eq('id', lead.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log activity
    await logLeadActivity(lead.id, 'lead_converted', {
      converted_by: userData.user.id,
      lead_name: lead.full_name,
      lead_email: lead.email,
      note: 'Lead marked as converted. Create student account manually to complete conversion.',
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to convert lead' };
  }
}

// ============= Pipeline Status Config =============

export const PIPELINE_STATUS_OPTIONS: { value: LeadPipelineStatus; label: string; color: string }[] = [
  { value: 'New', label: 'New', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  { value: 'Scheduled', label: 'Scheduled', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'Converted', label: 'Converted', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'Cold', label: 'Cold', color: 'bg-muted text-muted-foreground border-muted' },
];

// ============= Missing Field Detection =============

export function getMissingLeadFields(lead: Lead): string[] {
  const missing: string[] = [];
  
  if (!lead.dob) missing.push('DOB');
  if (!lead.guardian_phone) missing.push('Parent Phone');
  if (!lead.home_address) missing.push('Address');
  if (!lead.permit_number) missing.push('Permit #');
  
  return missing;
}

// ============= Follow-up Status =============

export function getFollowUpStatus(nextFollowUp: string | null): 'overdue' | 'due_today' | 'scheduled' | 'none' {
  if (!nextFollowUp) return 'none';
  
  const followUpDate = new Date(nextFollowUp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (followUpDate < today) return 'overdue';
  if (followUpDate < tomorrow) return 'due_today';
  return 'scheduled';
}
