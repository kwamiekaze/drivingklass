import { Notification, UserRole } from "@/types/portal";

interface ResolvedRoute {
  path: string;
  params?: Record<string, string>;
}

/**
 * Some historic notifications stored a link that only makes sense for one role
 * (e.g. '/instructor' on a student's row). Reject any link whose role prefix
 * doesn't match the current viewer so we never navigate to a 404 / denied page.
 */
function isLinkAllowedForRole(link: string, role: UserRole | null): boolean {
  const isStaff = role === "admin" || role === "staff";
  if (link.startsWith("/admin")) return isStaff;
  if (link.startsWith("/instructor")) return role === "instructor" || isStaff;
  if (link.startsWith("/student")) return role === "student" || isStaff;
  return true;
}

/**
 * Resolves a notification to the correct route based on type, entity, and user role
 */
export function resolveNotificationRoute(
  notification: Notification,
  userRole: UserRole | null
): ResolvedRoute {
  const { type, session_id, report_card_id, link, metadata } = notification;

  // Prefer a stored link, but only when it's valid for this role
  if (link && isLinkAllowedForRole(link, userRole)) {
    return { path: link };
  }

  // Get the base dashboard path for the role
  const dashboardPath = getDashboardPath(userRole);
  const isStaff = userRole === "admin" || userRole === "staff";

  // Route based on notification type
  switch (type) {
    case 'report_card':
    case 'report_card_posted':
    case 'report_card_viewed':
      if (report_card_id) {
        // Route through splash for the student, direct for everyone else
        if (userRole === 'student') {
          return { path: `/report-cards/open/${report_card_id}` };
        }
        return { path: `/report-cards/${report_card_id}` };
      }
      if (isStaff) {
        return { path: '/admin/report-cards' };
      }
      return { path: dashboardPath };

    case 'report_feedback_submitted':
    case 'report_feedback_updated':
      if (report_card_id) {
        return { path: `/report-cards/${report_card_id}`, params: { focus: 'feedback' } };
      }
      if (isStaff) {
        return { path: '/admin/feedback' };
      }
      return { path: dashboardPath };

    case 'session_created':
    case 'session_scheduled':
    case 'session_assigned':
    case 'session_cancelled':
    case 'session_rescheduled':
    case 'session_completed':
    case 'session_partially_completed':
    case 'session_updated':
    case 'schedule':
      if (isStaff) {
        return {
          path: '/admin/schedule',
          params: session_id ? { sessionId: session_id } : undefined,
        };
      }
      if (userRole === 'instructor') {
        return {
          path: '/instructor/schedule',
          params: session_id ? { sessionId: session_id } : undefined,
        };
      }
      // Students land on their dashboard calendar, focused on the session
      return {
        path: dashboardPath,
        params: session_id ? { sessionId: session_id } : undefined,
      };

    case 'proposal':
    case 'proposal_created':
    case 'proposal_accepted':
    case 'proposal_declined':
    case 'proposal_edit_requested': {
      const proposalId = (metadata as Record<string, unknown>)?.proposal_id as string | undefined;
      if (isStaff || userRole === 'instructor') {
        return { path: '/admin/proposals', params: proposalId ? { focus: proposalId } : undefined };
      }
      return { path: '/student/proposals', params: proposalId ? { focus: proposalId } : undefined };
    }

    case 'approval':
      // Admin/staff get the approvals queue; a student's own approval goes home
      if (isStaff) {
        const userId = (metadata as Record<string, unknown>)?.user_id as string | undefined;
        return {
          path: '/admin/approvals',
          params: userId ? { focus: userId } : undefined
        };
      }
      return { path: dashboardPath };

    case 'rejection':
      return { path: userRole === 'student' ? '/rejected' : dashboardPath };

    case 'intake_submitted': {
      const studentId = (metadata as Record<string, unknown>)?.user_id as string | undefined;
      if (isStaff) {
        return { path: '/admin/approvals', params: studentId ? { focus: studentId } : undefined };
      }
      return { path: userRole === 'student' ? '/profile' : dashboardPath };
    }

    case 'message':
      if (isStaff) {
        return { path: '/admin/messages' };
      }
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
