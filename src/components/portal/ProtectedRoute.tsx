import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { UserRole } from "@/types/portal";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireApproval?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireApproval = true 
}: ProtectedRouteProps) {
  const { user, role, isLoading, isApproved, isRejected, isPending, profile } = usePortalAuth();
  const location = useLocation();

  // ALWAYS show loading state - never blank screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile still loading or missing - show setup message with retry
  if (!profile && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up your profile...</p>
      </div>
    );
  }

  // Rejected users should see the rejected page
  if (isRejected && location.pathname !== '/rejected') {
    return <Navigate to="/rejected" replace />;
  }

  // ====== STRICT ROUTE ENFORCEMENT ======
  const pathname = location.pathname;

  // Admin routes: ONLY admin allowed (staff cannot access /admin)
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return <Navigate to={getRedirectPath(role as UserRole, isApproved)} replace />;
    }
  }

  // Instructor routes: ONLY instructor allowed
  if (pathname.startsWith('/instructor')) {
    if (role !== 'instructor') {
      return <Navigate to={getRedirectPath(role as UserRole, isApproved)} replace />;
    }
  }

  // Student routes: ONLY student allowed
  if (pathname.startsWith('/student')) {
    if (role !== 'student') {
      return <Navigate to={getRedirectPath(role as UserRole, isApproved)} replace />;
    }
  }

  // Check if user needs to complete intake or await approval (students only)
  if (requireApproval && role === 'student') {
    // If pending and not on pending-approval page
    if (isPending && location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  // Check role permissions (legacy check, still useful for explicit allowedRoles)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const redirectPath = getRedirectPath(role, isApproved);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function getRedirectPath(role: UserRole | null | undefined, isApproved: boolean): string {
  // If not approved, always go to pending
  if (!isApproved && role === 'student') {
    return '/pending-approval';
  }
  
  switch (role) {
    case 'admin':
      return '/admin';
    case 'staff':
      return '/admin'; // Staff goes to admin but will be blocked by route guard
    case 'instructor':
      return '/instructor';
    case 'student':
      return '/student';
    default:
      return '/login';
  }
}
