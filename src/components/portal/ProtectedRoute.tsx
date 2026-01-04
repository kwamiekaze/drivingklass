import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { UserRole } from "@/types/portal";
import { Loader2 } from "lucide-react";

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
  const { user, role, isLoading, isApproved, isRejected, isPending } = usePortalAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
      return <Navigate to={getRedirectPath(role as UserRole)} replace />;
    }
  }

  // Instructor routes: ONLY instructor allowed
  if (pathname.startsWith('/instructor')) {
    if (role !== 'instructor') {
      return <Navigate to={getRedirectPath(role as UserRole)} replace />;
    }
  }

  // Student routes: ONLY student allowed
  if (pathname.startsWith('/student')) {
    if (role !== 'student') {
      return <Navigate to={getRedirectPath(role as UserRole)} replace />;
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
    const redirectPath = getRedirectPath(role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function getRedirectPath(role: UserRole | null | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'staff':
      return '/admin'; // Staff goes to admin but will be blocked by route guard
    case 'instructor':
      return '/instructor';
    case 'student':
    default:
      return '/student';
  }
}
