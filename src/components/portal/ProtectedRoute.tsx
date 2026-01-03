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

  // Check if user needs to complete intake or await approval (students only)
  if (requireApproval && role === 'student') {
    // If pending and not on pending-approval page
    if (isPending && location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  // Check role permissions
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = getRedirectPath(role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function getRedirectPath(role: UserRole): string {
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
