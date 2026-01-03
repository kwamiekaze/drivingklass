import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, XCircle, Mail, Phone, Car } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RejectedStatus() {
  const { user, profile, isLoading, signOut, refetchProfile } = usePortalAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
      return;
    }

    // If approved, redirect to dashboard
    if (profile?.approval_status === 'approved') {
      navigate('/student');
    }

    // If pending, redirect to pending page
    if (profile?.approval_status === 'pending') {
      navigate('/pending-approval');
    }
  }, [isLoading, user, profile?.approval_status]);

  // Periodically check for status changes
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refetchProfile();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" onClick={handleSignOut} className="min-h-[44px]">
          Sign Out
        </Button>
      </div>
      
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Car className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gold-shimmer">DrivingKlass</span>
          </Link>
        </div>

        <Card className="portal-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Account Not Approved</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your account registration was not approved at this time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile?.rejection_reason && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  <strong>Reason:</strong> {profile.rejection_reason}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                If you believe this was a mistake or would like to resubmit your application, please contact our support team.
              </p>

              <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <a 
                    href="mailto:support@drivingklass.com" 
                    className="text-primary hover:underline break-all"
                  >
                    support@drivingklass.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a 
                    href="tel:+15551234567" 
                    className="text-primary hover:underline"
                  >
                    (555) 123-4567
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="w-full min-h-[44px]"
                onClick={() => window.location.href = 'mailto:support@drivingklass.com'}
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
              
              <Link to="/" className="w-full">
                <Button variant="ghost" className="w-full min-h-[44px]">
                  ← Back to Main Site
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
