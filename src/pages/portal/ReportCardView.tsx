import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, FileText, Calendar, User, Star, MessageSquare, Clock, Copy, Check, ShieldX } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RATING_CATEGORIES } from "@/types/portal";
import { useTheme } from "@/components/ThemeProvider";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";

interface ReportCardDetails {
  id: string;
  created_at: string;
  session_id: string;
  student_id: string;
  instructor_id: string;
  transcription_summary: string | null;
  message_to_student: string | null;
  internal_message: string | null;
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
  overall: number | null;
  session_starts_at: string | null;
  session_ends_at: string | null;
  session_status: string | null;
  student_name: string;
  instructor_name: string;
  student_email: string | null;
  instructor_email: string | null;
  can_see_internal: boolean;
}

export default function ReportCardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { user, role, isLoading: authLoading } = usePortalAuth();
  const { toast } = useToast();
  
  const [reportCard, setReportCard] = useState<ReportCardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Check if admin/instructor/staff for copy link visibility
  const canCopyLink = role === 'admin' || role === 'staff' || role === 'instructor';

  const fetchReportCard = async () => {
    if (!id) {
      setFetchError(true);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setFetchError(false);
    setUnauthorized(false);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setFetchError(true);
      setLoading(false);
    }, 10000);

    try {
      const { data, error } = await supabase.rpc('get_report_card_details', {
        p_report_card_id: id
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      if (!data || data.length === 0) {
        setUnauthorized(true);
      } else {
        setReportCard(data[0] as ReportCardDetails);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error fetching report card:', err);
      // Check if it's a permission error vs a general fetch error
      if (err?.code === 'PGRST116' || err?.message?.includes('permission')) {
        setUnauthorized(true);
      } else {
        setFetchError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on mount or when id changes
  useEffect(() => {
    if (user && id) {
      fetchReportCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'bg-muted';
    if (rating >= 8) return 'bg-green-500';
    if (rating >= 6) return 'bg-yellow-500';
    if (rating >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Report card link copied to clipboard. Recipient must sign in to view.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the URL from the address bar.",
        variant: "destructive",
      });
    }
  };

  const handleGoBack = () => {
    // Navigate to appropriate dashboard based on role
    if (role === 'student') {
      navigate('/student');
    } else if (role === 'instructor') {
      navigate('/instructor');
    } else {
      navigate('/admin');
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = encodeURIComponent(`/report-cards/${id}`);
      navigate(`/login?redirect=${redirectPath}`);
    }
  }, [user, authLoading, navigate, id]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirecting via useEffect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <PortalLayout>
      {/* Background matching homepage theme */}
      <div className="fixed inset-0 -z-10" style={{ pointerEvents: 'none' }}>
        {isDark ? (
          <>
            <div 
              className="absolute inset-0 transition-colors duration-500"
              style={{
                background: 'linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)',
              }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)',
              }}
            />
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
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              Report Card
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <Card className="portal-card">
            <CardContent className="py-12 text-center">
              <ShieldX className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load</h2>
              <p className="text-muted-foreground mb-6">
                There was an issue loading this report card. Please try again.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={fetchReportCard} variant="outline">
                  Retry
                </Button>
                <Button onClick={handleGoBack} className="cta-button">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : unauthorized ? (
          <Card className="portal-card">
            <CardContent className="py-12 text-center">
              <ShieldX className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                You don't have access to this report card.
              </p>
              <Button onClick={handleGoBack} className="cta-button">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : reportCard ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Copy Link Button (admin/instructor/staff only) */}
            {canCopyLink && (
              <>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyLink}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-right -mt-2">
                  Recipient must sign in to view.
                </p>
              </>
            )}

            {/* Header Info */}
            <Card className="portal-card">
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-sm sm:text-base">
                        {reportCard.session_starts_at 
                          ? format(parseISO(reportCard.session_starts_at), 'MMMM d, yyyy')
                          : format(parseISO(reportCard.created_at), 'MMMM d, yyyy')
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                    <p className="font-medium text-sm sm:text-base">
                      {reportCard.session_starts_at && reportCard.session_ends_at
                        ? `${format(parseISO(reportCard.session_starts_at), 'h:mm a')} - ${format(parseISO(reportCard.session_ends_at), 'h:mm a')}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Instructor</p>
                      <p className="font-medium text-sm sm:text-base truncate">{reportCard.instructor_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Student</p>
                      <p className="font-medium text-sm sm:text-base truncate">{reportCard.student_name}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                      <p className="font-medium text-sm sm:text-base">{format(parseISO(reportCard.created_at), 'MMMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Rating */}
            <Card className="portal-card">
              <CardContent className="p-4 sm:p-6">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Overall Rating</p>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                    <span className="text-3xl sm:text-4xl font-bold">{reportCard.overall || '-'}</span>
                    <span className="text-xl sm:text-2xl text-muted-foreground">/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Categories */}
            <Card className="portal-card">
              <CardContent className="p-4 sm:p-6">
                <h4 className="font-medium mb-4 text-sm sm:text-base">Skill Ratings</h4>
                <div className="grid gap-2">
                  {RATING_CATEGORIES.filter(cat => cat.key !== 'overall').map(category => {
                    const rating = reportCard[category.key as keyof ReportCardDetails] as number | null;
                    return (
                      <div key={category.key} className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm w-28 sm:w-40 truncate">{category.label}</span>
                        <div className="flex-1">
                          <Progress 
                            value={rating ? rating * 10 : 0} 
                            className="h-2"
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right">
                          {rating || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>


            {/* Transcription */}
            {reportCard.transcription_summary && (
              <Card className="portal-card">
                <CardContent className="p-4 sm:p-6">
                  <h4 className="font-medium mb-2 text-sm sm:text-base">Lesson Summary</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                    {reportCard.transcription_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Message to Student */}
            {reportCard.message_to_student && (
              <Card className="portal-card">
                <CardContent className="p-4 sm:p-6 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium text-sm">Instructor's Message</span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{reportCard.message_to_student}</p>
                </CardContent>
              </Card>
            )}

            {/* Internal Message (staff/admin only) */}
            {reportCard.can_see_internal && reportCard.internal_message && (
              <Card className="portal-card border-destructive/20">
                <CardContent className="p-4 sm:p-6 bg-destructive/10">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm text-destructive">Internal Notes (Staff Only)</span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{reportCard.internal_message}</p>
                </CardContent>
              </Card>
            )}

            {/* Edit Button for instructor/admin */}
            {(role === 'instructor' || role === 'admin' || role === 'staff') && (
              <Button 
                onClick={() => navigate(`/instructor/report-cards/edit/${reportCard.id}`)} 
                className="w-full cta-button min-h-[44px]"
              >
                Edit Report Card
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </PortalLayout>
  );
}
