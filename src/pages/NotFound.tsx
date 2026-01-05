import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user } = usePortalAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const getHomeRoute = () => {
    if (!user) return '/';
    switch (role) {
      case 'admin':
      case 'staff':
        return '/admin';
      case 'instructor':
        return '/instructor';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <Button onClick={() => navigate(getHomeRoute())} className="gap-2">
          <Home className="h-4 w-4" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
