import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Calendar, User, Clock, MessageSquare, ShieldX, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";
import { fetchSessionNumberForStudent } from "@/lib/sessionNumbering";
import { ReportCardHistoryList } from "@/components/portal/ReportCardHistoryList";

interface RoadTestData {
  id: string;
  session_id: string;
  student_id: string;
  instructor_id: string;
  result: string;
  notes: string | null;
  created_at: string;
  session_starts_at: string | null;
  session_ends_at: string | null;
  student_name: string;
  instructor_name: string;
}

export default function RoadTestResultView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = usePortalAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [data, setData] = useState<RoadTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/road-test-results/${sessionId}`)}`);
    }
  }, [user, authLoading, navigate, sessionId]);

  useEffect(() => {
    if (!user || !sessionId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Fetch road test result
        const { data: result, error: rtError } = await supabase
          .from("road_test_results")
          .select("id, session_id, student_id, instructor_id, result, notes, created_at")
          .eq("session_id", sessionId)
          .single();

        if (rtError || !result) {
          if (!cancelled) setNotFound(true);
          return;
        }

        // Fetch session details
        const { data: session } = await supabase
          .from("sessions")
          .select("starts_at, ends_at, student_id, instructor_id")
          .eq("id", sessionId)
          .single();

        // Fetch names
        const [studentRes, instrRes] = await Promise.all([
          supabase.from("profiles").select("full_name, first_name, last_name, email").eq("id", result.student_id).single(),
          supabase.from("profiles").select("full_name, first_name, last_name, email").eq("id", result.instructor_id).single(),
        ]);

        const getName = (p: any) => {
          if (!p) return "Unknown";
          const combined = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          return combined || p.full_name || p.email || "Unknown";
        };

        // Get session number
        const num = await fetchSessionNumberForStudent(supabase, result.student_id, sessionId);

        if (!cancelled) {
          setData({
            ...result,
            session_starts_at: session?.starts_at || null,
            session_ends_at: session?.ends_at || null,
            student_name: getName(studentRes.data),
            instructor_name: getName(instrRes.data),
          });
          setSessionNumber(num);
        }
      } catch (err) {
        console.error("Error loading road test result:", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, sessionId]);

  const handleGoBack = () => {
    if (role === "student") navigate("/student");
    else if (role === "instructor") navigate("/instructor");
    else navigate("/admin");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPassed = data?.result === "passed";

  return (
    <PortalLayout>
      {/* Background */}
      <div className="fixed inset-0 -z-10" style={{ pointerEvents: "none" }}>
        {isDark ? (
          <>
            <div className="absolute inset-0 transition-colors duration-500" style={{ background: "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)" }} />
            <GalaxyStars />
          </>
        ) : (
          <LightModeBackground />
        )}
      </div>

      <div className="max-w-3xl mx-auto space-y-6 relative">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold theme-heading flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              {sessionNumber ? `Session ${sessionNumber} — Road Test Result` : "Road Test Result"}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound ? (
          <Card className="portal-card">
            <CardContent className="py-12 text-center">
              <ShieldX className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Road test result is not available yet.</h2>
              <p className="text-muted-foreground mb-6">
                The result for this road test has not been submitted yet, or you don't have access.
              </p>
              <Button onClick={handleGoBack} className="cta-button">Go to Dashboard</Button>
            </CardContent>
          </Card>
        ) : unauthorized ? (
          <Card className="portal-card">
            <CardContent className="py-12 text-center">
              <ShieldX className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">You don't have access to this road test result.</p>
              <Button onClick={handleGoBack} className="cta-button">Go to Dashboard</Button>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Session Info */}
            <Card className="portal-card">
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-sm sm:text-base report-text-sweep">
                        {data.session_starts_at
                          ? format(parseISO(data.session_starts_at), "MMMM d, yyyy")
                          : format(parseISO(data.created_at), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                    <p className="font-medium text-sm sm:text-base report-text-sweep">
                      {data.session_starts_at && data.session_ends_at
                        ? `${format(parseISO(data.session_starts_at), "h:mm a")} - ${format(parseISO(data.session_ends_at), "h:mm a")}`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Instructor</p>
                      <p className="font-medium text-sm sm:text-base truncate report-text-sweep">{data.instructor_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Student</p>
                      <p className="font-medium text-sm sm:text-base truncate report-text-sweep">{data.student_name}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                      <p className="font-medium text-sm sm:text-base report-text-sweep">
                        {format(parseISO(data.created_at), "MMMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result */}
            <Card className="portal-card">
              <CardContent className="p-6 sm:p-8">
                <div className={`text-center p-6 sm:p-8 rounded-xl ${isPassed ? "bg-green-500/10 border border-green-500/20" : "bg-orange-500/10 border border-orange-500/20"}`}>
                  <div className="mb-3">
                    {isPassed ? (
                      <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                  <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${isPassed ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {isPassed ? "Passed 🚀" : "Must Retry"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isPassed ? "Congratulations on passing the road test!" : "Keep practicing — you'll get there!"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {data.notes && (
              <Card className="portal-card">
                <CardContent className="p-4 sm:p-6 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium text-sm">Road Test Notes</span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap report-text-sweep">{data.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Session History */}
            <ReportCardHistoryList
              studentId={data.student_id}
              currentSessionId={sessionId}
            />
          </div>
        ) : null}
      </div>
    </PortalLayout>
  );
}
