import { Notification, UserRole } from "@/types/portal";

interface ResolvedRoute {
  path: string;
  params?: Record<string, string>;
}

/**
 * Resolves a notification to the correct route based on type, entity, and user role
 */
export function resolveNotificationRoute(
  notification: Notification,
  userRole: UserRole | null
): ResolvedRoute {
  const { type, session_id, report_card_id, link, metadata } = notification;

  // If there's a custom link, prefer it
  if (link) {
    return { path: link };
  }

  // Get the base dashboard path for the role
  const dashboardPath = getDashboardPath(userRole);

  // Route based on notification type
  switch (type) {
    case 'report_card':
    case 'report_card_posted':
      if (report_card_id) {
        // Route through splash for student/instructor, direct for admin/staff
        if (userRole === 'student' || userRole === 'instructor') {
          return { path: `/report-cards/open/${report_card_id}` };
        }
        return { path: `/report-cards/${report_card_id}` };
      }
      // Fallback to reports tab
      if (userRole === 'admin' || userRole === 'staff') {
        return { path: '/admin/report-cards' };
      }
      return { path: dashboardPath };

    case 'report_feedback_submitted':
    case 'report_feedback_updated':
      if (report_card_id) {
        return { path: `/report-cards/${report_card_id}`, params: { focus: 'feedback' } };
      }
      if (userRole === 'admin' || userRole === 'staff') {
        return { path: '/admin/feedback' };
      }
      return { path: dashboardPath };

    case 'session_created':
    case 'session_scheduled':
    case 'session_cancelled':
    case 'session_rescheduled':
    case 'session_completed':
    case 'schedule':
      // For session notifications, route to schedule/calendar
      if (userRole === 'admin' || userRole === 'staff') {
        return { 
          path: '/admin/schedule',
          params: session_id ? { sessionId: session_id } : undefined
        };
      }
      // Students and instructors go to their dashboard (which has calendar)
      return { path: dashboardPath };

    case 'approval':
      // Only admin/staff should get approval notifications
      if (userRole === 'admin' || userRole === 'staff') {
        const userId = (metadata as Record<string, unknown>)?.user_id as string | undefined;
        return { 
          path: '/admin/approvals',
          params: userId ? { focus: userId } : undefined
        };
      }
      return { path: dashboardPath };

    case 'rejection':
      return { path: '/rejected' };

    case 'intake_submitted':
      // Admin/staff sees this in approvals
      if (userRole === 'admin' || userRole === 'staff') {
        return { path: '/admin/approvals' };
      }
      return { path: dashboardPath };

    case 'message':
      // Future: Route to messages/chat when implemented
      return { path: dashboardPath };

    case 'system':
    case 'payment':
    case 'reminder':
    default:
      return { path: dashboardPath };
  }
}

/**
 * Get the dashboard path for a given role
 */
export function getDashboardPath(role: UserRole | null): string {
  switch (role) {
    case 'admin':
    case 'staff':
      return '/admin';
    case 'instructor':
      return '/instructor';
    case 'student':
    default:
      return '/student';
  }
}

/**
 * Build URL with query params
 */
export function buildNotificationUrl(resolved: ResolvedRoute): string {
  let url = resolved.path;
  if (resolved.params && Object.keys(resolved.params).length > 0) {
    const searchParams = new URLSearchParams(resolved.params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}

/**
 * Check if user has access to a notification's target
 */
export function canAccessNotification(
  notification: Notification,
  userRole: UserRole | null,
  userId: string | null
): boolean {
  // User must own the notification
  if (!userId || notification.user_id !== userId) {
    return false;
  }

  // Additional role-based checks for specific notification types
  const { type } = notification;
  
  // Approval notifications only for admin/staff
  if (type === 'approval' || type === 'intake_submitted') {
    return userRole === 'admin' || userRole === 'staff';
  }

  return true;
}
