import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Loader2 } from "lucide-react";

/**
 * Redirect component for legacy profile URLs.
 * Redirects /instructor/profile, /student/profile, /admin/profile, etc. to /profile
 */
export default function ProfileRedirect() {
  const { user, isLoading } = usePortalAuth();
  const location = useLocation();

  useEffect(() => {
    console.log(`Legacy profile route accessed: ${location.pathname}, redirecting to /profile`);
  }, [location.pathname]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to canonical profile route
  return <Navigate to="/profile" replace />;
}
