import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Clock, FileText, CheckCircle, ArrowRight, Car, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PendingApproval() {
  const { user, profile, role, isLoading, isApproved, isRejected, isIntakeSubmitted, signOut, refetchProfile } = usePortalAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
      return;
    }

    // Redirect rejected users
    if (isRejected) {
      navigate('/rejected');
      return;
    }

    if (isApproved && role) {
      switch (role) {
        case 'admin':
        case 'staff':
          navigate('/admin');
          break;
        case 'instructor':
          navigate('/instructor');
          break;
        case 'student':
        default:
          navigate('/student');
          break;
      }
    }
  }, [isLoading, user, isApproved, isRejected, role]);

  // Periodically check for approval
  useEffect(() => {
    if (!user || isApproved || isRejected) return;
    
    const interval = setInterval(() => {
      refetchProfile();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, isApproved, isRejected]);

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
      {/* Theme toggle on the left, sign out on the right */}
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>
      <div className="absolute top-4 right-4">
        <Button variant="ghost" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
      
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Car className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gold-shimmer">DrivingKlass</span>
          </Link>
        </div>

        <Card className="luxury-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isIntakeSubmitted ? (
                <Clock className="h-16 w-16 text-primary animate-pulse" />
              ) : (
                <FileText className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle>
              {isIntakeSubmitted ? "Awaiting Approval" : "Complete Your Profile"}
            </CardTitle>
            <CardDescription>
              {isIntakeSubmitted 
                ? "Your profile is being reviewed by our team" 
                : "Please complete your student intake form to proceed"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isIntakeSubmitted ? (
              <>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your intake form has been submitted. Our team will review your information and approve your account shortly. You'll receive a notification once approved.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Account created</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Intake form submitted</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-5 w-5 text-primary animate-pulse" />
                    <span>Awaiting admin approval</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  This page will automatically redirect once you're approved.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Before you can start booking lessons, we need some information from you including your permit details and emergency contact information.
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Account created</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span className="font-medium">Complete intake form</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-5 w-5" />
                    <span>Await admin approval</span>
                  </div>
                </div>

                <Link to="/student/profile">
                  <Button className="w-full cta-button">
                    Complete Intake Form
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}

            <div className="text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to Main Site
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
