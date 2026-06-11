import { useState, useEffect } from "react";
import { Star, ExternalLink, Loader2, Send, Pencil, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

interface LessonRatingProps {
  reportCardId: string;
  studentId?: string;
  instructorId?: string;
  sessionId?: string;
  studentName?: string;
  readOnly?: boolean;
  isPublicView?: boolean;
}

interface RatingEntry {
  id: string;
  rating_value: number;
  feedback_text: string | null;
  submitted_by_role: string | null;
  submitted_by_name: string | null;
  is_public_view: boolean | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
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
  const { t } = useTranslation();
  const isDark = resolvedTheme === "dark";

  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [publicName, setPublicName] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editFeedback, setEditFeedback] = useState("");
  const [editHover, setEditHover] = useState(0);
  // All ratings for staff/instructor read-only view
  const [allRatings, setAllRatings] = useState<RatingEntry[]>([]);

  useEffect(() => {
    const checkExisting = async () => {
      try {
        if (readOnly) {
          const { data } = await supabase
            .from("report_card_ratings" as any)
            .select("id, rating_value, feedback_text, submitted_by_role, submitted_by_name, is_public_view, is_edited, created_at, updated_at")
            .eq("report_card_id", reportCardId)
            .order("created_at", { ascending: false });
          if (data) setAllRatings(data as any);
        } else {
          let query = supabase
            .from("report_card_ratings" as any)
            .select("id, rating_value, feedback_text, created_at")
            .eq("report_card_id", reportCardId);

          if (studentId) {
            query = query.eq("student_id", studentId);
          } else if (isPublicView) {
            query = query.eq("is_public_view", true).is("student_id", null);
          }

          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            const d = data as any;
            setExistingId(d.id);
            setExistingRating(d.rating_value);
            setSelectedRating(d.rating_value);
            setSubmitted(true);
            if (d.feedback_text) {
              setExistingFeedback(d.feedback_text);
              setFeedbackText(d.feedback_text);
              setFeedbackSubmitted(true);
            }
          }
        }
      } catch (err) {
        console.error("Error checking existing rating:", err);
      } finally {
        setLoading(false);
      }
    };
    checkExisting();
  }, [reportCardId, studentId, isPublicView, readOnly]);

  const sendFeedbackNotification = async (rating: number, isUpdate: boolean) => {
    try {
      // Get report card to find instructor
      const { data: rc } = await supabase
        .from("report_cards")
        .select("instructor_id, student_id, session_id")
        .eq("id", reportCardId)
        .single();
      if (!rc) return;

      const submitterName = studentName || publicName.trim() || (isPublicView ? "A public viewer" : "A viewer");
      const action = isUpdate ? "updated feedback on" : "left feedback on";
      const notifType = isUpdate ? "report_feedback_updated" : "report_feedback_submitted";

      // Notify instructor
      await supabase.from("notifications").insert([
        {
          user_id: rc.instructor_id,
          title: `${rating}-Star Rating Received`,
          message: `${submitterName} ${action} a report card.`,
          type: notifType,
          report_card_id: reportCardId,
          session_id: rc.session_id,
          severity: rating <= 2 ? "warning" : "info",
        },
      ]);

      // Notify admins — get all admin/staff user ids
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "staff"]);
      if (staffRoles) {
        const adminNotifs = staffRoles
          .filter((r: any) => r.user_id !== rc.instructor_id)
          .map((r: any) => ({
            user_id: r.user_id,
            title: `${rating}-Star Rating Received`,
            message: `${submitterName} ${action} a report card.`,
            type: notifType,
            report_card_id: reportCardId,
            session_id: rc.session_id,
            severity: rating <= 2 ? "warning" : "info",
          }));
        if (adminNotifs.length > 0) {
          await supabase.from("notifications").insert(adminNotifs);
        }
      }
    } catch (err) {
      console.error("Failed to send feedback notification:", err);
    }
  };

  const openEditMode = (nextRating?: number) => {
    const initialRating = nextRating ?? existingRating ?? selectedRating;
    setEditRating(initialRating || 0);
    setEditFeedback(existingFeedback || feedbackText || "");
    setEditHover(0);
    setEditing(true);
  };

  const handleStarClick = (rating: number) => {
    if (submitting || submittingFeedback || readOnly) return;

    if (submitted) {
      openEditMode(rating);
      return;
    }

    setSelectedRating(rating);
    if (rating === 5) {
      submitRating(rating);
    }
  };

  const submitRating = async (rating: number, feedback?: string) => {
    setSubmitting(true);
    try {
      const insertData: any = {
        report_card_id: reportCardId,
        rating_value: rating,
        session_id: sessionId || null,
        student_id: studentId || null,
        instructor_id: instructorId || null,
        submitted_by_role: isPublicView ? "public" : (studentId ? "student" : "anonymous"),
        submitted_by_name: isPublicView ? (publicName.trim() || null) : (studentName || null),
        is_public_view: isPublicView,
        feedback_text: feedback?.trim() || null,
      };

      const { error } = await supabase
        .from("report_card_ratings" as any)
        .insert([insertData]);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already rated", description: "You've already rated this lesson." });
          setSubmitted(true);
          setExistingRating(rating);
          return;
        }
        throw error;
      }

      setSubmitted(true);
      setExistingRating(rating);
      setExistingFeedback(feedback?.trim() || null);
      if (feedback?.trim()) setFeedbackSubmitted(true);
      toast({ title: "Thank you!", description: rating === 5 ? "Thank you for your 5-star rating!" : "Your feedback has been submitted." });

      // Send notification
      await sendFeedbackNotification(rating, false);
    } catch (err) {
      console.error("Rating submission error:", err);
      if (!feedback) setSelectedRating(0);
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || submittingFeedback) return;
    if (publicEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail.trim())) {
      toast({ title: "Invalid email format", variant: "destructive" });
      return;
    }

    if (!submitted) {
      await submitRating(selectedRating, feedbackText);
    } else {
      setSubmittingFeedback(true);
      try {
        const updateData: any = { feedback_text: feedbackText.trim() };
        if (isPublicView && publicName.trim()) updateData.submitted_by_name = publicName.trim();

        let query = supabase
          .from("report_card_ratings" as any)
          .update(updateData)
          .eq("report_card_id", reportCardId);

        if (studentId) {
          query = query.eq("student_id", studentId);
        } else {
          query = query.eq("is_public_view", true).is("student_id", null);
        }

        const { error } = await query;
        if (error) throw error;
        setFeedbackSubmitted(true);
        setExistingFeedback(feedbackText.trim());
        toast({ title: "Feedback saved!" });
        await sendFeedbackNotification(selectedRating, true);
      } catch {
        toast({ title: "Failed to save feedback", variant: "destructive" });
      } finally {
        setSubmittingFeedback(false);
      }
    }
  };

  // Edit mode handlers
  const startEditing = () => {
    openEditMode();
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditRating(0);
    setEditFeedback("");
    setEditHover(0);
  };

  const saveEdit = async () => {
    if (editRating < 1 || editRating > 5) return;
    if (editRating <= 4 && !editFeedback.trim()) {
      toast({ title: "Feedback required for 1-4 star ratings", variant: "destructive" });
      return;
    }
    setSubmittingFeedback(true);
    try {
      const updateData: any = {
        rating_value: editRating,
        feedback_text: editFeedback.trim() || null,
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("report_card_ratings" as any)
        .update(updateData)
        .eq("report_card_id", reportCardId);

      if (studentId) {
        query = query.eq("student_id", studentId);
      } else {
        query = query.eq("is_public_view", true).is("student_id", null);
      }

      const { error } = await query;
      if (error) throw error;

      setSelectedRating(editRating);
      setExistingRating(editRating);
      setExistingFeedback(editFeedback.trim() || null);
      if (editFeedback.trim()) {
        setFeedbackText(editFeedback.trim());
        setFeedbackSubmitted(true);
      }
      setEditing(false);
      toast({ title: "Your feedback has been updated." });
      await sendFeedbackNotification(editRating, true);
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <Card className="report-rating-panel border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Read-only mode for admin/instructor — show all feedback entries
  if (readOnly) {
    if (allRatings.length === 0) return null;
    return (
      <Card className="report-rating-panel border-primary/20" id="feedback">
        <CardContent className="p-4 sm:p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            {t('rating.viewerFeedback')}
          </h4>
          <div className="space-y-4">
            {allRatings.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "rounded-xl p-3 sm:p-4 border",
                  isDark ? "bg-primary/5 border-primary/10" : "bg-muted/50 border-border/50"
                )}
              >
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-4 w-4 transition-colors",
                          s <= entry.rating_value
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-foreground">{entry.rating_value}/5</span>
                    {entry.is_edited && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5">{t('rating.edited')}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(entry.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {entry.feedback_text ? (
                  <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{entry.feedback_text}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 mt-2 italic">{t('rating.noWrittenFeedback')}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {entry.submitted_by_name ? `${entry.submitted_by_name} · ` : ""}
                  {entry.is_public_view ? t('rating.publicViewer') : entry.submitted_by_role === "student" ? t('common.student') : t('rating.viewer')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRating = submitted ? selectedRating : hoveredStar || selectedRating;
  const showFeedbackForm = selectedRating >= 1 && selectedRating <= 4 && !feedbackSubmitted && !editing;
  const showThankYou14 = selectedRating >= 1 && selectedRating <= 4 && feedbackSubmitted && !editing;

  return (
    <Card className="report-rating-panel overflow-hidden border-border/50 backdrop-blur transition-all duration-500" id="feedback">
      <div className="report-rating-glare" />

      <CardContent className="relative z-10 p-5 sm:p-8">
        {/* Title */}
        <div className="text-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold mb-1 tracking-wide report-text-sweep">
            {t('rating.title')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('rating.subtitle')}
          </p>
        </div>

        {/* Edit Mode */}
        {editing ? (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2">
            {/* Editable Stars */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (editHover || editRating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    onMouseEnter={() => setEditHover(star)}
                    onMouseLeave={() => setEditHover(0)}
                    className={cn(
                      "relative p-1 rounded-full transition-all duration-300 ease-out cursor-pointer",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      "hover:scale-125 active:scale-95",
                      isActive && "scale-110"
                    )}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "h-10 w-10 sm:h-12 sm:w-12 transition-all duration-300",
                        isActive
                          ? "fill-primary text-primary"
                          : isDark
                          ? "text-muted-foreground/30 hover:text-muted-foreground/50"
                          : "text-muted-foreground/25 hover:text-muted-foreground/40"
                      )}
                      style={isActive ? { filter: isDark ? "drop-shadow(0 0 6px hsl(43 74% 49% / 0.7))" : "drop-shadow(0 0 4px hsl(43 75% 50% / 0.5))" } : undefined}
                    />
                  </button>
                );
              })}
            </div>

            {/* Feedback textarea for edits */}
            <div>
              <Label htmlFor="edit-feedback" className="text-xs text-muted-foreground">
                {t('rating.yourFeedback')} {editRating <= 4 ? t('rating.required14') : t('rating.optional5')}
              </Label>
              <Textarea
                id="edit-feedback"
                placeholder={t('rating.feedbackPlaceholder')}
                value={editFeedback}
                onChange={(e) => setEditFeedback(e.target.value)}
                rows={3}
                maxLength={1000}
                className="mt-1 resize-none text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={saveEdit}
                disabled={submittingFeedback || editRating < 1 || (editRating <= 4 && !editFeedback.trim())}
                className={cn(
                  "flex-1 min-h-[44px] gap-2 font-semibold text-sm",
                  "bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-lg",
                  "transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                )}
              >
                {submittingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={cancelEditing} className="min-h-[44px] gap-1">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Stars (non-edit mode) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= displayRating;
                const canClick = !submitting && !submittingFeedback && !readOnly;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={!canClick}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => canClick && setHoveredStar(star)}
                    onMouseLeave={() => canClick && setHoveredStar(0)}
                    className={cn(
                      "relative p-1 rounded-full transition-all duration-300 ease-out",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      canClick && "cursor-pointer hover:scale-125 active:scale-95",
                      !canClick && "cursor-default",
                      isActive && "scale-110"
                    )}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "h-10 w-10 sm:h-12 sm:w-12 transition-all duration-300",
                        isActive
                          ? "fill-primary text-primary"
                          : isDark
                          ? "text-muted-foreground/30 hover:text-muted-foreground/50"
                          : "text-muted-foreground/25 hover:text-muted-foreground/40"
                      )}
                      style={isActive ? { filter: isDark ? "drop-shadow(0 0 6px hsl(43 74% 49% / 0.7)) drop-shadow(0 0 14px hsl(43 74% 49% / 0.4))" : "drop-shadow(0 0 4px hsl(43 75% 50% / 0.5))" } : undefined}
                    />
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

            {/* === 5-Star Thank You + Google Review === */}
            {submitted && selectedRating === 5 && (
              <div
                className={cn(
                  "rounded-xl p-4 sm:p-6 mt-2 transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4",
                  isDark ? "bg-primary/5 border border-primary/10" : "bg-primary/5 border border-primary/15"
                )}
              >
                <p className="text-sm sm:text-base font-semibold text-foreground mb-3 report-text-sweep">
                  Thank you for your 5-star rating!
                </p>
                <p className={cn("text-xs sm:text-sm leading-relaxed mb-5", isDark ? "text-muted-foreground" : "report-text-sweep")}>
                  Driving Klass is locally owned and focuses on quality service rather than paid
                  sponsorships or advertising. Our growth comes directly from the experiences our
                  students share.
                </p>
                <p className={cn("text-xs sm:text-sm leading-relaxed mb-6", isDark ? "text-muted-foreground" : "report-text-sweep")}>
                  If you'd like, we would greatly appreciate you taking a moment to share your
                  experience with a Google review. Your feedback helps future students and parents
                  feel confident in choosing Driving Klass.
                </p>
                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="block">
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

                {/* Edit button for 5-star */}
                <div className="mt-4 text-center">
                  <Button variant="ghost" size="sm" onClick={startEditing} className="text-xs gap-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" /> Edit Rating
                  </Button>
                </div>
              </div>
            )}

            {/* === 1-4 Stars: Feedback Form === */}
            {showFeedbackForm && selectedRating > 0 && (
              <div
                className={cn(
                  "rounded-xl p-4 sm:p-6 mt-2 transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4",
                  isDark ? "bg-primary/5 border border-primary/10" : "bg-primary/5 border border-primary/15"
                )}
              >
                <p className="text-sm sm:text-base font-semibold text-foreground mb-1">Tell us more</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                  We appreciate your feedback and would love to know more about your experience.
                </p>

                <div className="space-y-3">
                  {isPublicView && !studentId && (
                    <>
                      <div>
                        <Label htmlFor="rating-name" className="text-xs text-muted-foreground">Name (optional)</Label>
                        <Input id="rating-name" placeholder="Your name" value={publicName} onChange={(e) => setPublicName(e.target.value)} maxLength={100} className="mt-1 text-sm" />
                      </div>
                      <div>
                        <Label htmlFor="rating-email" className="text-xs text-muted-foreground">Email (optional)</Label>
                        <Input id="rating-email" type="email" placeholder="your@email.com" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} maxLength={255} className="mt-1 text-sm" />
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="rating-feedback" className="text-xs text-muted-foreground">Your feedback</Label>
                    <Textarea id="rating-feedback" placeholder="Tell us what went well or what could have been better…" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={3} maxLength={1000} className="mt-1 resize-none text-sm" />
                  </div>

                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackText.trim() || submitting || submittingFeedback}
                    className={cn(
                      "w-full min-h-[48px] gap-2 font-semibold text-sm",
                      "bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-lg",
                      "transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                      isDark && "shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)]"
                    )}
                  >
                    {submitting || submittingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Feedback
                  </Button>
                </div>
              </div>
            )}

            {/* === 1-4 Stars: Thank You After Submission === */}
            {showThankYou14 && (
              <div
                className={cn(
                  "rounded-xl p-4 sm:p-6 mt-2 text-center transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4",
                  isDark ? "bg-primary/5 border border-primary/10" : "bg-primary/5 border border-primary/15"
                )}
              >
                <Star className="h-8 w-8 text-primary mx-auto mb-3 fill-primary" />
                <p className="text-sm sm:text-base font-semibold text-foreground mb-2 report-text-sweep">
                  Thank you for your feedback.
                </p>
                <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-muted-foreground" : "report-text-sweep")}>
                  It helps us improve our quality of service. We appreciate you taking the time to share your experience.
                </p>
                {existingFeedback && (
                  <p className={cn("mt-3 text-xs sm:text-sm italic", isDark ? "text-foreground/70" : "report-text-sweep")}>"{existingFeedback}"</p>
                )}
                <div className="mt-4">
                  <Button variant="ghost" size="sm" onClick={startEditing} className="text-xs gap-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" /> Edit Feedback
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
