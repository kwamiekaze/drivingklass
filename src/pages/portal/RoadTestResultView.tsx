import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Calendar, User, Clock, MessageSquare, ShieldX, CheckCircle, XCircle, ClipboardCheck, Copy, Check, Share2, Lock, Link2, Eye, EyeOff } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import { DarkModeBackground } from "@/components/DarkModeBackground";
import { LightModeBackground } from "@/components/LightModeBackground";
import { fetchSessionNumberForStudent } from "@/lib/sessionNumbering";
import { ReportCardHistoryList } from "@/components/portal/ReportCardHistoryList";
import { LessonRating } from "@/components/portal/LessonRating";

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
  report_card_id: string | null;
}

type StaffViewMode = "normal" | "student" | "accessed";

export default function RoadTestResultView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = usePortalAuth();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [data, setData] = useState<RoadTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);

  // Staff view mode
  const [viewMode, setViewMode] = useState<StaffViewMode>("normal");
  const isStaff = role === "admin" || role === "staff" || role === "instructor";

  // Public sharing state
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [sharingLoading, setSharingLoading] = useState(false);
  const [publicCopied, setPublicCopied] = useState(false);

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
          .select("starts_at, ends_at, student_id, instructor_id, report_card_id")
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

        // Get report_card for sharing state
        const reportCardId = session?.report_card_id || null;
        let sharingState = { isPublic: false, publicSlug: null as string | null };
        if (reportCardId) {
          const { data: rcRow } = await supabase
            .from("report_cards")
            .select("is_public, public_share_slug")
            .eq("id", reportCardId)
            .single();
          if (rcRow) {
            sharingState = {
              isPublic: rcRow.is_public || false,
              publicSlug: rcRow.public_share_slug || null,
            };
          }
        } else {
          // Try finding report_card by session_id
          const { data: rcRow } = await supabase
            .from("report_cards")
            .select("id, is_public, public_share_slug")
            .eq("session_id", sessionId)
            .single();
          if (rcRow) {
            sharingState = {
              isPublic: rcRow.is_public || false,
              publicSlug: rcRow.public_share_slug || null,
            };
          }
        }

        if (!cancelled) {
          setData({
            ...result,
            session_starts_at: session?.starts_at || null,
            session_ends_at: session?.ends_at || null,
            student_name: getName(studentRes.data),
            instructor_name: getName(instrRes.data),
            report_card_id: reportCardId || null,
          });
          setSessionNumber(num);
          setIsPublic(sharingState.isPublic);
          setPublicSlug(sharingState.publicSlug);

          // Mark viewed when the owning student opens their road test report
          // (the RPC re-enforces this server-side; staff previews never count).
          const rcId = reportCardId || (await getReportCardIdForSession(sessionId));
          if (rcId && user.id === result.student_id) {
            supabase
              .rpc("mark_report_card_viewed", { p_report_card_id: rcId, p_via: "student" })
              .then(({ error: rpcErr }) => {
                if (rpcErr) console.warn("mark_report_card_viewed failed", rpcErr);
              }, () => {});
          }
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

  // Sharing helpers
  const generateSlug = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const getReportCardId = async (): Promise<string | null> => {
    if (data?.report_card_id) return data.report_card_id;
    const { data: rc } = await supabase
      .from("report_cards")
      .select("id")
      .eq("session_id", sessionId!)
      .single();
    return rc?.id || null;
  };

  const handleEnablePublic = async () => {
    if (!user) return;
    if (!accessCodeInput.trim()) {
      toast({ title: "Access code required", description: "Please enter an access code.", variant: "destructive" });
      return;
    }
    if (accessCodeInput !== confirmCodeInput) {
      toast({ title: "Codes don't match", description: "Access code and confirmation must match.", variant: "destructive" });
      return;
    }
    if (accessCodeInput.length < 4) {
      toast({ title: "Code too short", description: "Access code must be at least 4 characters.", variant: "destructive" });
      return;
    }

    const rcId = await getReportCardId();
    if (!rcId) {
      toast({ title: "Error", description: "No associated report record found.", variant: "destructive" });
      return;
    }

    setSharingLoading(true);
    const slug = publicSlug || generateSlug();

    const { error } = await supabase
      .from("report_cards")
      .update({
        is_public: true,
        public_access_code: accessCodeInput.trim(),
        public_share_slug: slug,
        public_enabled_at: new Date().toISOString(),
        public_enabled_by: user.id,
      })
      .eq("id", rcId);

    setSharingLoading(false);

    if (error) {
      toast({ title: "Error", description: "Failed to enable public access.", variant: "destructive" });
    } else {
      setIsPublic(true);
      setPublicSlug(slug);
      setAccessCodeInput("");
      setConfirmCodeInput("");
      toast({ title: "Public Access Enabled", description: "Road test result is now publicly accessible with the access code." });
    }
  };

  const handleDisablePublic = async () => {
    const rcId = await getReportCardId();
    if (!rcId) return;

    setSharingLoading(true);
    const { error } = await supabase
      .from("report_cards")
      .update({
        is_public: false,
        public_access_code: null,
        public_share_slug: null,
        public_enabled_at: null,
        public_enabled_by: null,
      })
      .eq("id", rcId);

    setSharingLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to disable public access.", variant: "destructive" });
    } else {
      setIsPublic(false);
      setPublicSlug(null);
      toast({ title: "Public Access Disabled" });
    }
  };

  const handleUpdateCode = async () => {
    if (!user) return;
    if (!accessCodeInput.trim()) {
      toast({ title: "Access code required", variant: "destructive" });
      return;
    }
    if (accessCodeInput !== confirmCodeInput) {
      toast({ title: "Codes don't match", variant: "destructive" });
      return;
    }

    const rcId = await getReportCardId();
    if (!rcId) return;

    setSharingLoading(true);
    const { error } = await supabase
      .from("report_cards")
      .update({ public_access_code: accessCodeInput.trim() })
      .eq("id", rcId);

    setSharingLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update access code.", variant: "destructive" });
    } else {
      setAccessCodeInput("");
      setConfirmCodeInput("");
      toast({ title: "Access Code Updated" });
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/report/public/${publicSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setPublicCopied(true);
      toast({ title: "Public Link Copied", description: "Share this link along with the access code." });
      setTimeout(() => setPublicCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPassed = data?.result === "passed";

  // Determine what to show based on view mode
  const showInternalNotes = viewMode === "normal" && isStaff;
  const showSharingSection = viewMode === "normal" && isStaff;
  const showRating = viewMode !== "normal" || role === "student";

  return (
    <PortalLayout>
      {/* Background */}
      <div className="fixed inset-0 -z-10" style={{ pointerEvents: "none" }}>
        {isDark ? (
          <>
            <div className="absolute inset-0 transition-colors duration-500" style={{ background: "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)" }} />
            <DarkModeBackground />
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

        {/* Staff View Mode Toggle */}
        {isStaff && data && !loading && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewMode === "normal" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("normal")}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Normal View
            </Button>
            <Button
              variant={viewMode === "student" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("student")}
              className="gap-1.5"
            >
              <User className="h-3.5 w-3.5" />
              View as Student
            </Button>
            <Button
              variant={viewMode === "accessed" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("accessed")}
              className="gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              View as Accessed
            </Button>
          </div>
        )}

        {/* View Mode Banner */}
        {isStaff && viewMode !== "normal" && (
          <div className={`p-3 rounded-lg border text-sm font-medium text-center ${
            viewMode === "student"
              ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
              : "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300"
          }`}>
            {viewMode === "student"
              ? `👁️ Viewing as Student: ${data?.student_name || "Student"}`
              : "🔗 Viewing as Access-Granted Viewer"}
          </div>
        )}

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

            {/* Lesson Rating moved below session history */}

            {/* Public Sharing Section (staff only, normal view) */}
            {showSharingSection && (
              <Card className="portal-card border-primary/20">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Public Access</span>
                  </div>

                  {isPublic ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <Link2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm text-green-500 font-medium">Public access is enabled</span>
                      </div>

                      <Button
                        onClick={handleCopyPublicLink}
                        variant="outline"
                        className="w-full gap-2 min-h-[44px]"
                      >
                        {publicCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {publicCopied ? "Copied!" : "Copy Public Link"}
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        This public link is for viewers without a DrivingKlass account. They must enter the access code you set.
                      </p>

                      {/* Update access code */}
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">Update Access Code</p>
                        <div className="space-y-2">
                          <Input
                            placeholder="New access code"
                            value={accessCodeInput}
                            onChange={(e) => setAccessCodeInput(e.target.value)}
                            autoComplete="off"
                          />
                          <Input
                            placeholder="Confirm new access code"
                            value={confirmCodeInput}
                            onChange={(e) => setConfirmCodeInput(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdateCode}
                            variant="outline"
                            size="sm"
                            disabled={sharingLoading || !accessCodeInput.trim()}
                            className="flex-1"
                          >
                            {sharingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update Code"}
                          </Button>
                          <Button
                            onClick={handleDisablePublic}
                            variant="destructive"
                            size="sm"
                            disabled={sharingLoading}
                            className="flex-1"
                          >
                            Disable Public Access
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">This road test result is private</span>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Access Code</Label>
                        <Input
                          placeholder="Set access code (min 4 characters)"
                          value={accessCodeInput}
                          onChange={(e) => setAccessCodeInput(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Confirm Access Code</Label>
                        <Input
                          placeholder="Confirm access code"
                          value={confirmCodeInput}
                          onChange={(e) => setConfirmCodeInput(e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <Button
                        onClick={handleEnablePublic}
                        className="w-full cta-button min-h-[44px] gap-2"
                        disabled={sharingLoading || !accessCodeInput.trim()}
                      >
                        {sharingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                        Make this result public
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Session History */}
            <ReportCardHistoryList
              studentId={data.student_id}
              currentSessionId={sessionId}
            />

            {/* Lesson Rating — always at the very bottom */}
            {data.report_card_id && (
              <div className="pb-8">
                <LessonRating
                  reportCardId={data.report_card_id}
                  studentId={role === "student" ? user?.id : undefined}
                  instructorId={data.instructor_id}
                  sessionId={data.session_id}
                  studentName={data.student_name}
                  readOnly={viewMode !== "normal" ? true : isStaff}
                  isPublicView={viewMode === "accessed"}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </PortalLayout>
  );
}
