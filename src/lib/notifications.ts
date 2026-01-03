import { supabase } from "@/integrations/supabase/client";
import { NotificationType, NotificationSeverity } from "@/types/portal";

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a notification to a user
 * This function can be called from admin/staff actions
 */
export async function sendNotification({
  userId,
  title,
  body,
  type,
  severity = 'info',
  link,
  metadata,
}: SendNotificationParams): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message: body,
    type,
    severity,
    link,
    metadata,
    read: false,
  });

  if (error) {
    console.error('Failed to send notification:', error);
    return { error: error as Error };
  }

  return { error: null };
}

/**
 * Send approval notification
 */
export async function sendApprovalNotification(userId: string): Promise<{ error: Error | null }> {
  return sendNotification({
    userId,
    title: 'Account Approved',
    body: 'Your account has been approved. You can now access your portal.',
    type: 'approval',
    severity: 'success',
    link: '/student',
  });
}

/**
 * Send rejection notification
 */
export async function sendRejectionNotification(
  userId: string,
  reason?: string
): Promise<{ error: Error | null }> {
  return sendNotification({
    userId,
    title: 'Account Rejected',
    body: reason 
      ? `Your account was rejected. Reason: ${reason}` 
      : 'Your account was rejected. Please contact support for more information.',
    type: 'rejection',
    severity: 'critical',
    link: '/pending-approval',
  });
}

/**
 * Send session scheduled notification
 */
export async function sendSessionScheduledNotification(
  userId: string,
  sessionDate: string
): Promise<{ error: Error | null }> {
  return sendNotification({
    userId,
    title: 'Session Scheduled',
    body: `A new driving session has been scheduled for ${sessionDate}.`,
    type: 'schedule',
    severity: 'info',
    link: '/student',
  });
}

/**
 * Send session cancelled notification
 */
export async function sendSessionCancelledNotification(
  userId: string,
  sessionDate: string,
  reason?: string
): Promise<{ error: Error | null }> {
  return sendNotification({
    userId,
    title: 'Session Cancelled',
    body: reason 
      ? `Your session on ${sessionDate} has been cancelled. Reason: ${reason}` 
      : `Your session on ${sessionDate} has been cancelled.`,
    type: 'schedule',
    severity: 'warning',
    link: '/student',
  });
}

/**
 * Send report card notification
 */
export async function sendReportCardNotification(userId: string): Promise<{ error: Error | null }> {
  return sendNotification({
    userId,
    title: 'New Report Card',
    body: 'Your instructor has submitted a report card for your lesson.',
    type: 'report_card',
    severity: 'info',
    link: '/student',
  });
}
