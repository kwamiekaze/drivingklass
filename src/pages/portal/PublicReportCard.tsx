import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Lock, Star, FileText, Calendar, User, Clock, MessageSquare, ShieldX } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RATING_CATEGORIES } from "@/types/portal";
import reportCardSplashVideo from "@/assets/report-card-splash.mov";
import { StudentProgressSection } from "@/components/portal/StudentProgressSection";
import { useScrollActive } from "@/hooks/useScrollActive";

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
}

type ViewState = "code_entry" | "splash" | "viewing" | "not_found";

export default function PublicReportCard() {
  const { slug } = useParams<{ slug: string }>();
  // Start at code_entry — splash plays AFTER successful verification
  const [viewState, setViewState] = useState<ViewState>("code_entry");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PublicReportData | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useScrollActive();

  // Splash handlers — transition from splash to viewing
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
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/verify-report-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, access_code: accessCode.trim() }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setError("Incorrect access code. Please try again.");
        } else if (res.status === 404) {
          setViewState("not_found");
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      // Store report data, then show splash before revealing content
      setReport(data.report);
      setViewState("splash");

      // Start fallback timer for splash
      fallbackRef.current = setTimeout(() => {
        if (!videoLoaded) handleSplashComplete();
      }, 4000);
    } catch {
      setError("Unable to verify. Please try again.");
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

  // ── Splash Screen (plays AFTER code verification) ──
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
            Tap to continue
          </div>
        )}
      </div>
    );
  }

  // ── Not Found ──
  if (viewState === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)" }}>
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="py-12 text-center">
            <ShieldX className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Not Available</h2>
            <p className="text-muted-foreground">
              This report card is no longer available for public viewing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Access Code Entry ──
  if (viewState === "code_entry") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)" }}>
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Report Card</h1>
              <p className="text-sm text-muted-foreground">
                This report card has been shared securely. Enter the access code provided to view it.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Input
                  placeholder="Enter access code"
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
                Unlock Report Card
              </Button>
            </form>

            <p className="text-[10px] text-muted-foreground text-center mt-6">
              Powered by DrivingKlass
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Report Card View ──
  if (!report) return null;

  return (
    <div className={`min-h-screen p-4 sm:p-6 ${isScrolling ? 'scroll-active' : ''}`}
      style={{ background: "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)" }}>
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Branding */}
        <div className="text-center py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <FileText className="h-6 w-6" />
            Report Card
          </h1>
          <p className="text-xs text-muted-foreground mt-1">DrivingKlass</p>
        </div>

        {/* Header Info */}
        <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm text-foreground">
                    {report.session_starts_at
                      ? format(parseISO(report.session_starts_at), "MMMM d, yyyy")
                      : format(parseISO(report.created_at), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium text-sm text-foreground">
                  {report.session_starts_at && report.session_ends_at
                    ? `${format(parseISO(report.session_starts_at), "h:mm a")} - ${format(parseISO(report.session_ends_at), "h:mm a")}`
                    : "N/A"}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Instructor</p>
                  <p className="font-medium text-sm text-foreground truncate">{report.instructor_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium text-sm text-foreground truncate">{report.student_name}</p>
                </div>
              </div>
              <div className="col-span-2 flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium text-sm text-foreground">
                    {format(parseISO(report.created_at), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Rating */}
        <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Overall Rating</p>
              <div className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <span className="text-3xl sm:text-4xl font-bold text-foreground">{report.overall || "-"}</span>
                <span className="text-xl sm:text-2xl text-muted-foreground">/10</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skill Progress Graph (if enabled publicly) */}
        {report.show_graph_publicly && report.student_id && (
          <div className="report-graph-section">
            <StudentProgressSection studentId={report.student_id} compact />
          </div>
        )}

        {/* Skill Ratings */}
        <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            <h4 className="font-medium mb-4 text-sm sm:text-base text-foreground">Skill Ratings</h4>
            <div className="grid gap-2">
              {RATING_CATEGORIES.filter((cat) => cat.key !== "overall").map((category) => {
                const rating = report[category.key as keyof PublicReportData] as number | null;
                return (
                  <div key={category.key} className="flex items-center gap-2 sm:gap-3 report-skill-bar">
                    <span className="text-xs sm:text-sm w-28 sm:w-40 truncate text-foreground">{category.label}</span>
                    <div className="flex-1">
                      <Progress value={rating ? rating * 10 : 0} className="h-2" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right text-foreground">
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
              <h4 className="font-medium mb-2 text-sm sm:text-base text-foreground">Lesson Summary</h4>
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
                <span className="font-medium text-sm text-foreground">Instructor's Message</span>
              </div>
              <p className="text-xs sm:text-sm whitespace-pre-wrap report-text-sweep">{report.message_to_student}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          Shared securely by DrivingKlass
        </p>
      </div>
    </div>
  );
}
