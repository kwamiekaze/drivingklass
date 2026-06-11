import { useState, useRef, useEffect } from "react";
import { SkillHighlightsDisplay } from "@/components/portal/SkillHighlightsDisplay";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Lock, Star, FileText, Calendar, User, Clock, MessageSquare, ShieldX, Menu, X, LogIn, ChevronRight, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RATING_CATEGORIES } from "@/types/portal";
import reportCardSplashVideo from "@/assets/report-card-splash.mov";
import { StudentProgressSection } from "@/components/portal/StudentProgressSection";
import { useScrollActive } from "@/hooks/useScrollActive";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LessonRating } from "@/components/portal/LessonRating";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useSkillLabel } from "@/i18n/skills";
import { LanguageSwitcherButton } from "@/components/LanguageSwitcherButton";

interface PublicReportData {
  id: string;
  created_at: string;
  student_name: string;
  instructor_name: string;
  student_id: string;
  session_starts_at: string | null;
  session_ends_at: string | null;
  session_type: string;
  overall: number | null;
  transcription_summary: string | null;
  message_to_student: string | null;
  show_graph_publicly: boolean;
  acceleration: number | null;
  braking: number | null;
  left_turns: number | null;
  right_turns: number | null;
  speed_maintenance: number | null;
  lane_maintenance: number | null;
  blind_spots: number | null;
  signal_usage: number | null;
  changing_lanes: number | null;
  following_distance: number | null;
  road_sign_awareness: number | null;
  distractions: number | null;
  general_parking: number | null;
  reverse_parking: number | null;
  parallel_parking: number | null;
  straight_line_backing: number | null;
  turn_about: number | null;
  merging: number | null;
  interstate: number | null;
  strongest_skills?: any[];
  most_improved_skills?: any[];
  focus_areas?: any[];
  session_number?: number | null;
  road_test_result?: string | null;
  road_test_notes?: string | null;
}

type ViewState = "code_entry" | "splash" | "viewing" | "not_found";

export default function PublicReportCard() {
  const { slug } = useParams<{ slug: string }>();
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const skillLabel = useSkillLabel();
  const [viewState, setViewState] = useState<ViewState>("code_entry");
  const [accessCode, setAccessCode] = useState("");
  const [verifiedAccessCode, setVerifiedAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PublicReportData | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useScrollActive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSplashComplete = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      setViewState("viewing");
      setIsFading(false);
      setVideoLoaded(false);
    }, 400);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !slug) return;

    setLoading(true);
    setError("");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/verify-report-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ slug, access_code: accessCode.trim() }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setError(t("public.incorrectCode"));
        } else if (res.status === 404) {
          setViewState("not_found");
        } else {
          setError(t("public.somethingWrong"));
        }
        return;
      }

      setReport(data.report);
      setVerifiedAccessCode(accessCode.trim());
      setViewState("splash");

      fallbackRef.current = setTimeout(() => {
        if (!videoLoaded) handleSplashComplete();
      }, 4000);
    } catch {
      setError(t("public.unableVerify"));
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return "bg-muted";
    if (rating >= 8) return "bg-green-500";
    if (rating >= 6) return "bg-yellow-500";
    if (rating >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  // ── Splash Screen ──
  if (viewState === "splash") {
    return (
      <div
        onClick={handleSplashComplete}
        style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          zIndex: 9999, overflow: "hidden", backgroundColor: "#000",
          opacity: isFading ? 0 : 1, transition: "opacity 400ms ease-out",
          cursor: "pointer", touchAction: "manipulation",
        }}
      >
        <video
          ref={videoRef}
          src={reportCardSplashVideo}
          autoPlay muted playsInline preload="auto"
          onLoadedData={handleVideoLoaded}
          onEnded={handleSplashComplete}
          onError={handleSplashComplete}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover", opacity: videoLoaded ? 1 : 0, transition: "opacity 400ms",
            pointerEvents: "none",
          }}
        />
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {videoLoaded && (
          <div
            style={{
              position: "absolute",
              bottom: "max(5rem, calc(env(safe-area-inset-bottom, 2rem) + 3rem))",
              left: "50%", transform: "translateX(-50%)",
              fontSize: "0.875rem", letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(212, 165, 116, 0.8)",
              textShadow: "0 0 20px rgba(212, 165, 116, 0.4)",
              pointerEvents: "none", zIndex: 10,
            }}
          >
            {t("public.tapToContinue")}
          </div>
        )}
      </div>
    );
  }

  // ── Not Found ──
  if (viewState === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <LanguageSwitcherButton />
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="py-12 text-center">
            <ShieldX className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">{t("public.notAvailable")}</h2>
            <p className="text-muted-foreground">
              {t("public.notAvailableBody")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Access Code Entry ──
  if (viewState === "code_entry") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <LanguageSwitcherButton />
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("public.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("public.secureIntro")}
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Input
                  placeholder={t("public.enterCode")}
                  value={accessCode}
                  onChange={(e) => { setAccessCode(e.target.value); setError(""); }}
                  className="text-center text-lg tracking-widest h-12"
                  autoFocus
                  autoComplete="off"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full cta-button h-12" disabled={loading || !accessCode.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                {t("public.unlock")}
              </Button>
            </form>

            <p className="text-[10px] text-muted-foreground text-center mt-6">
              {t("public.powered")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Report Card View ──
  if (!report) return null;

  return (
    <div className={`min-h-screen bg-background ${isScrolling ? 'scroll-active' : ''}`}>
      {/* Branded Header with hamburger menu */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <h1 
              className={cn(
                "font-poppins font-extrabold tracking-widest uppercase",
                "text-xl sm:text-2xl md:text-3xl",
                "tracking-[0.15em]",
                "relative transition-colors duration-300",
                resolvedTheme === "dark" && "text-neon-gold animate-breathing-glow"
              )}
              style={{
                color: resolvedTheme === "dark" ? 'hsl(48 90% 78%)' : 'hsl(0 0% 12%)',
                textShadow: resolvedTheme === "dark"
                  ? undefined
                  : '0 0 2px hsl(43 75% 50% / 0.7), 0 0 10px hsl(43 75% 50% / 0.35), 1px 1px 0 hsl(43 75% 50% / 0.25), -1px -1px 0 hsl(43 75% 50% / 0.25)',
              }}
            >
              DRIVINGKLASS
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcherButton />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-border/50 bg-card/95 backdrop-blur px-4 py-3">
            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("public.home")}
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="h-4 w-4" />
                {t("public.signIn")}
              </Link>
            </nav>
          </div>
        )}
      </header>

      <div className="p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Report Card Title */}
          <div className="text-center py-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              {report.session_type === 'testing' ? (
                <>
                  <ClipboardCheck className="h-6 w-6" />
                  {report.session_number ? t('report.sessionRoadTest', { n: report.session_number }) : t('report.roadTestResult')}
                </>
              ) : (
                <>
                  <FileText className="h-6 w-6" />
                  {report.session_number ? t('report.sessionLabel', { n: report.session_number }) : t('report.reportCard')}
                </>
              )}
            </h1>
          </div>

          {/* Header Info */}
          <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                    <p className="font-medium text-sm report-text-sweep">
                      {report.session_starts_at
                        ? format(parseISO(report.session_starts_at), "MMMM d, yyyy")
                        : format(parseISO(report.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('common.time')}</p>
                  <p className="font-medium text-sm report-text-sweep">
                    {report.session_starts_at && report.session_ends_at
                      ? `${format(parseISO(report.session_starts_at), "h:mm a")} - ${format(parseISO(report.session_ends_at), "h:mm a")}`
                      : t('common.na')}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.instructor')}</p>
                    <p className="font-medium text-sm truncate report-text-sweep">{report.instructor_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.student')}</p>
                    <p className="font-medium text-sm truncate report-text-sweep">{report.student_name}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.submitted')}</p>
                    <p className="font-medium text-sm report-text-sweep">
                      {format(parseISO(report.created_at), "MMMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {report.session_type === 'testing' ? (
            <>
              {/* Road Test Result */}
              <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="p-6 sm:p-8">
                  <div className={`text-center p-6 sm:p-8 rounded-xl ${report.road_test_result === 'passed' ? "bg-green-500/10 border border-green-500/20" : "bg-orange-500/10 border border-orange-500/20"}`}>
                    <div className="mb-3">
                      {report.road_test_result === 'passed' ? (
                        <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${report.road_test_result === 'passed' ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                      {report.road_test_result === 'passed' ? t('report.passed') : t('report.mustRetry')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {report.road_test_result === 'passed' ? t('report.passedSubtitle') : t('report.retrySubtitle')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Road Test Notes */}
              {(report.road_test_notes || report.message_to_student) && (
                <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
                  <CardContent className="p-4 sm:p-6 bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium text-sm text-foreground">{t('report.roadTestNotes')}</span>
                    </div>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap report-text-sweep">
                      {report.road_test_notes || report.message_to_student}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Session History for authorized viewer */}
              <PublicSessionHistory
                studentId={report.student_id}
                currentReportId={report.id}
                accessCode={verifiedAccessCode}
              />

              {/* Lesson Rating — always at the very bottom */}
              <div className="pb-8">
                <LessonRating
                  reportCardId={report.id}
                  studentName={report.student_name}
                  isPublicView={true}
                />
              </div>
            </>
          ) : (
            <>
              {/* Overall Rating */}
              <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('report.overallRating')}</p>
                    <div className="flex items-center justify-center gap-2">
                      <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                      <span className="text-3xl sm:text-4xl font-bold report-text-sweep">{report.overall || "-"}</span>
                      <span className="text-xl sm:text-2xl text-muted-foreground">/10</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skill Progress Graph (if enabled publicly) */}
              {report.show_graph_publicly && report.student_id && (
                <div className="report-graph-section">
                  <StudentProgressSection
                    studentId={report.student_id}
                    reportCardId={report.id}
                    anchorReport={report}
                    savedHighlights={{
                      strongest_skills: report.strongest_skills,
                      most_improved_skills: report.most_improved_skills,
                      focus_areas: report.focus_areas,
                    }}
                    compact
                  />
                </div>
              )}

              {/* Skill Progress Highlights */}
              <SkillHighlightsDisplay
                strongest={report.strongest_skills}
                mostImproved={report.most_improved_skills}
                focusAreas={report.focus_areas}
              />

              {/* Skill Ratings */}
              <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="p-4 sm:p-6">
                  <h4 className="font-medium mb-4 text-sm sm:text-base text-foreground">{t('report.skillRatings')}</h4>
                  <div className="grid gap-2">
                    {RATING_CATEGORIES.filter((cat) => cat.key !== "overall").map((category) => {
                      const rating = report[category.key as keyof PublicReportData] as number | null;
                      return (
                        <div key={category.key} className="flex items-center gap-2 sm:gap-3 report-skill-bar">
                          <span className="text-xs sm:text-sm w-28 sm:w-40 truncate report-text-sweep">{skillLabel(category.key, category.label)}</span>
                          <div className="flex-1">
                            <Progress value={rating ? rating * 10 : 0} className="h-2" />
                          </div>
                          <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right report-text-sweep">
                            {rating || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Lesson Summary */}
              {report.transcription_summary && (
                <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
                  <CardContent className="p-4 sm:p-6">
                    <h4 className="font-medium mb-2 text-sm sm:text-base text-foreground">{t('report.lessonSummary')}</h4>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap report-text-sweep">
                      {report.transcription_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Message to Student */}
              {report.message_to_student && (
                <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
                  <CardContent className="p-4 sm:p-6 bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium text-sm text-foreground">{t('report.instructorsMessage')}</span>
                    </div>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap report-text-sweep">{report.message_to_student}</p>
                  </CardContent>
                </Card>
              )}

              {/* Session History for authorized viewer */}
              <PublicSessionHistory
                studentId={report.student_id}
                currentReportId={report.id}
                accessCode={verifiedAccessCode}
              />

              {/* Lesson Rating — always at the very bottom */}
              <div className="pb-8">
                <LessonRating
                  reportCardId={report.id}
                  studentName={report.student_name}
                  isPublicView={true}
                />
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground py-4">
            {t("public.sharedSecurely")}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * PublicSessionHistory — shows all public completed results for authorized viewers
 * Includes both driving reports and road test results
 */
function PublicSessionHistory({ studentId, currentReportId, accessCode }: { 
  studentId: string; 
  currentReportId: string;
  accessCode: string;
}) {
  const [items, setItems] = useState<Array<{
    id: string;
    public_share_slug: string | null;
    session_id: string;
    created_at: string;
    overall: number | null;
    instructor_id: string;
    instructor_name: string;
    session_type: string;
    road_test_outcome: string | null;
    sessionNumber: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Get all public completed report cards for this student
        const { data: reports } = await supabase
          .from('report_cards')
          .select('id, created_at, overall, instructor_id, public_share_slug, session_id')
          .eq('student_id', studentId)
          .eq('is_public', true)
          .eq('report_card_status', 'completed')
          .not('public_share_slug', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (cancelled || !reports || reports.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        // Get session info for all reports
        const sessionIds = reports.map(r => r.session_id).filter(Boolean);
        const [sessionsRes, roadTestsRes] = await Promise.all([
          supabase
            .from('sessions')
            .select('id, starts_at, session_type')
            .in('id', sessionIds)
            .neq('status', 'cancelled')
            .order('starts_at', { ascending: true }),
          supabase
            .from('road_test_results')
            .select('session_id, result')
            .eq('student_id', studentId)
            .in('session_id', sessionIds),
        ]);

        const sessionMap: Record<string, { starts_at: string; session_type: string }> = {};
        (sessionsRes.data || []).forEach(s => { sessionMap[s.id] = { starts_at: s.starts_at, session_type: s.session_type }; });

        const roadTestMap: Record<string, string> = {};
        (roadTestsRes.data || []).forEach(rt => { roadTestMap[rt.session_id] = rt.result; });

        // Build session number map from ALL non-cancelled sessions for the student
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('id, starts_at')
          .eq('student_id', studentId)
          .neq('status', 'cancelled')
          .order('starts_at', { ascending: true });

        const sessionNumMap: Record<string, number> = {};
        (allSessions || []).forEach((s, i) => { sessionNumMap[s.id] = i + 1; });

        // Instructor names
        const instrIds = [...new Set(reports.map(r => r.instructor_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name')
          .in('id', instrIds);

        const instrMap: Record<string, string> = {};
        (profiles || []).forEach(p => {
          instrMap[p.id] = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Instructor';
        });

        if (!cancelled) {
          setItems(reports.map(r => {
            const sess = sessionMap[r.session_id] || null;
            const isRoadTest = sess?.session_type === 'testing';
            return {
              id: r.id,
              public_share_slug: r.public_share_slug,
              session_id: r.session_id,
              created_at: r.created_at!,
              overall: isRoadTest ? null : r.overall,
              instructor_id: r.instructor_id,
              instructor_name: instrMap[r.instructor_id] || 'Instructor',
              session_type: sess?.session_type || 'driving',
              road_test_outcome: isRoadTest ? (roadTestMap[r.session_id] || null) : null,
              sessionNumber: sessionNumMap[r.session_id] || 0,
            };
          }));
        }
      } catch (e) {
        console.error('Failed to load public session history', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) return null;
  if (items.length <= 1) return null;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <FileText className="h-4 w-4" />
          Session History
          <Badge variant="secondary" className="text-xs ml-auto">{items.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.map(item => {
          const isCurrent = item.id === currentReportId;
          const isRoadTest = item.session_type === 'testing';
          return (
            <a
              key={item.id}
              href={isCurrent ? undefined : `/report/public/${item.public_share_slug}`}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                isCurrent
                  ? 'bg-primary/10 border-primary/30 cursor-default'
                  : 'bg-card hover:bg-accent/50 border-border cursor-pointer'
              }`}
              onClick={isCurrent ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.sessionNumber > 0 && (
                    <Badge variant="outline" className="text-[10px]">Session {item.sessionNumber}</Badge>
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {format(parseISO(item.created_at), 'MMM d, yyyy')}
                  </span>
                  {isRoadTest ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <ClipboardCheck className="h-2.5 w-2.5" />Road Test
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] capitalize">Driving</Badge>
                  )}
                  {isRoadTest && item.road_test_outcome && (
                    <Badge className={`text-[10px] gap-1 border-0 ${
                      item.road_test_outcome === 'passed'
                        ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                        : 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                    }`}>
                      {item.road_test_outcome === 'passed' ? (
                        <><CheckCircle className="h-2.5 w-2.5" />Passed</>
                      ) : (
                        <><XCircle className="h-2.5 w-2.5" />Must Retry</>
                      )}
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                      Currently Viewing
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.instructor_name}
                </p>
              </div>
              {!isRoadTest && item.overall && (
                <div className="flex items-center gap-1 text-sm font-semibold shrink-0 text-foreground">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  {item.overall}/10
                </div>
              )}
              {!isCurrent && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
