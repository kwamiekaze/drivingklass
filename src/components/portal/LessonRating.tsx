import { useState, useEffect } from "react";
import { Star, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface LessonRatingProps {
  reportCardId: string;
  studentId?: string;
  instructorId?: string;
  sessionId?: string;
  studentName?: string;
  /** If true, show read-only display for admin/instructor */
  readOnly?: boolean;
  /** If true, this is a public (anonymous) view */
  isPublicView?: boolean;
}

const GOOGLE_REVIEW_URL = "https://g.page/r/CRABMUtSlA6IEBE/review/";

export function LessonRating({
  reportCardId,
  studentId,
  instructorId,
  sessionId,
  studentName,
  readOnly = false,
  isPublicView = false,
}: LessonRatingProps) {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [existingDate, setExistingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing rating
  useEffect(() => {
    const checkExisting = async () => {
      try {
        let query = supabase
          .from("report_card_ratings" as any)
          .select("rating_value, created_at")
          .eq("report_card_id", reportCardId);

        if (studentId) {
          query = query.eq("student_id", studentId);
        } else if (isPublicView) {
          query = query.eq("is_public_view", true).is("student_id", null);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          setExistingRating((data as any).rating_value);
          setExistingDate((data as any).created_at);
          setSelectedRating((data as any).rating_value);
          setSubmitted(true);
        }
      } catch (err) {
        console.error("Error checking existing rating:", err);
      } finally {
        setLoading(false);
      }
    };

    checkExisting();
  }, [reportCardId, studentId, isPublicView]);

  const handleStarClick = async (rating: number) => {
    if (submitted || submitting || readOnly) return;
    setSelectedRating(rating);
    setSubmitting(true);

    try {
      const insertData: any = {
        report_card_id: reportCardId,
        rating_value: rating,
        session_id: sessionId || null,
        student_id: studentId || null,
        instructor_id: instructorId || null,
        submitted_by_role: isPublicView ? "public" : (studentId ? "student" : "anonymous"),
        submitted_by_name: studentName || null,
        is_public_view: isPublicView,
      };

      const { error } = await supabase
        .from("report_card_ratings" as any)
        .insert([insertData]);

      if (error) {
        if (error.code === "23505") {
          // Duplicate — already rated
          toast({ title: "Already rated", description: "You've already rated this lesson." });
          setSubmitted(true);
          setExistingRating(rating);
          return;
        }
        throw error;
      }

      setSubmitted(true);
      setExistingRating(rating);
      toast({ title: "Rating submitted!", description: "Thank you for your feedback." });
    } catch (err) {
      console.error("Rating submission error:", err);
      setSelectedRating(0);
      toast({ title: "Failed to submit rating", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      await supabase
        .from("report_card_ratings" as any)
        .update({ feedback_text: feedbackText.trim() })
        .eq("report_card_id", reportCardId)
        .eq(studentId ? "student_id" : "is_public_view", studentId || true);
      toast({ title: "Feedback saved!" });
    } catch {
      // Silent fail for optional feedback
    }
  };

  if (loading) {
    return (
      <Card className="portal-card border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Read-only mode for admin/instructor
  if (readOnly) {
    if (!existingRating) return null;
    return (
      <Card className="portal-card border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Student Rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-5 w-5 transition-colors",
                      star <= existingRating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-foreground">{existingRating}/5</span>
              </div>
            </div>
            {existingDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(existingDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRating = submitted ? selectedRating : hoveredStar || selectedRating;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 backdrop-blur transition-all duration-500",
        isDark
          ? "bg-gradient-to-b from-card/90 to-card/70 border-primary/20 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.15)]"
          : "bg-card/90 shadow-lg"
      )}
    >
      <CardContent className="p-5 sm:p-8">
        {/* Title */}
        <div className="text-center mb-6">
          <h3
            className={cn(
              "text-lg sm:text-xl font-bold mb-1 tracking-wide",
              isDark ? "text-primary" : "text-foreground"
            )}
          >
            Rate Your Experience
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Share your experience with this lesson or instructor.
          </p>
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= displayRating;
            const isInteractive = !submitted && !submitting;
            return (
              <button
                key={star}
                type="button"
                disabled={!isInteractive}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => isInteractive && setHoveredStar(star)}
                onMouseLeave={() => isInteractive && setHoveredStar(0)}
                className={cn(
                  "relative p-1 rounded-full transition-all duration-300 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isInteractive && "cursor-pointer hover:scale-110 active:scale-95",
                  !isInteractive && "cursor-default",
                  isActive && "scale-105"
                )}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 transition-all duration-300",
                    isActive
                      ? "fill-primary text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                      : isDark
                      ? "text-muted-foreground/30 hover:text-muted-foreground/50"
                      : "text-muted-foreground/25 hover:text-muted-foreground/40"
                  )}
                  style={
                    isActive
                      ? {
                          filter: isDark
                            ? "drop-shadow(0 0 6px hsl(43 74% 49% / 0.7)) drop-shadow(0 0 14px hsl(43 74% 49% / 0.4))"
                            : "drop-shadow(0 0 4px hsl(43 75% 50% / 0.5))",
                        }
                      : undefined
                  }
                />
                {/* Pulse ring on selection */}
                {isActive && submitted && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: "hsl(var(--primary))" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {submitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Submitting...</span>
          </div>
        )}

        {/* Post-rating content */}
        {submitted && selectedRating > 0 && (
          <div
            className={cn(
              "rounded-xl p-4 sm:p-6 mt-2 transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4",
              isDark
                ? "bg-primary/5 border border-primary/10"
                : "bg-primary/5 border border-primary/15"
            )}
          >
            {selectedRating === 5 ? (
              <>
                <p className="text-sm sm:text-base font-semibold text-foreground mb-3">
                  Thank you for your 5-star rating!
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
                  Driving Klass is a locally owned driving school that focuses on quality service
                  rather than paid sponsorships or advertising. Our growth comes directly from the
                  experiences our students share.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                  If you'd like, we would greatly appreciate you taking a moment to share your
                  experience with a Google review. Your feedback helps future students and parents
                  feel confident in choosing Driving Klass.
                </p>
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    className={cn(
                      "w-full min-h-[48px] gap-2 font-semibold text-sm sm:text-base tracking-wide",
                      "bg-gradient-to-r from-primary via-primary to-primary/90",
                      "hover:from-primary/90 hover:via-primary hover:to-primary",
                      "text-primary-foreground shadow-lg",
                      "transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                      isDark && "shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)]"
                    )}
                  >
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                    Leave a Google Review
                    <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </a>
              </>
            ) : (
              <>
                <p className="text-sm sm:text-base font-semibold text-foreground mb-2">
                  Thank you for your feedback.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                  We appreciate you taking the time to share your experience.
                </p>
                {/* Optional feedback text area for 1-4 stars */}
                {!feedbackText && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Tell us more (optional)"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="resize-none text-sm"
                    />
                    {feedbackText.trim() && (
                      <Button
                        onClick={handleSubmitFeedback}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Submit Feedback
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}