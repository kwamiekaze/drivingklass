import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, CheckCircle, Clock, User, AlertTriangle, RefreshCw } from "lucide-react";
import { Session, ReportCard, Profile } from "@/types/portal";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { ReportCardList } from "@/components/portal/ReportCardList";
import { HoursRemainingCard } from "@/components/portal/HoursRemainingCard";
import { Link } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";
import { getDisplayName } from "@/lib/profileUtils";
import { useTranslation } from "react-i18next";

export default function StudentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <PortalLayout>
        <StudentDashboardContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function StudentDashboardContent() {
  const { profile, user } = usePortalAuth();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [instructor, setInstructor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedHours, setCompletedHours] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch sessions with instructor AND student info
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*, instructor:profiles!sessions_instructor_id_fkey(*), student:profiles!sessions_student_id_fkey(*)')
        .eq('student_id', user.id)
        .order('starts_at', { ascending: true });

      if (sessionsError) throw sessionsError;
      
      if (sessionsData) {
        setSessions(sessionsData as Session[]);
      }

      // Fetch report cards - only completed ones (RLS enforces this, but also filter client-side)
      const { data: reportCardsData, error: reportCardsError } = await supabase
        .from('report_cards')
        .select('*, session:sessions!report_cards_session_id_fkey(*), instructor:profiles!report_cards_instructor_id_fkey(*), student:profiles!report_cards_student_id_fkey(*)')
        .eq('student_id', user.id)
        .eq('report_card_status', 'completed')
        .order('created_at', { ascending: false });

      if (reportCardsError) throw reportCardsError;
      
      if (reportCardsData) {
        // Remove internal_message from student view
        const sanitized = reportCardsData.map(rc => ({
          ...rc,
          internal_message: null
        }));
        setReportCards(sanitized as ReportCard[]);
      }

      // Fetch assigned instructor
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('instructor_students')
        .select('instructor:profiles!instructor_students_instructor_id_fkey(*)')
        .eq('student_id', user.id)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      
      if (assignmentData?.instructor) {
        setInstructor(assignmentData.instructor as Profile);
      }

      // Fetch completed hours via RPC
      const { data: completedHoursData } = await supabase.rpc('compute_completed_hours', { p_student_id: user.id });
      if (completedHoursData !== null && completedHoursData !== undefined) {
        setCompletedHours(Number(completedHoursData));
      }
    } catch (err: any) {
      console.error('Error fetching student data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const upcomingSessions = sessions.filter(s => 
    s.status === 'scheduled' && isAfter(parseISO(s.starts_at), new Date())
  );

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const averageRating = reportCards.length > 0 
    ? Math.round(reportCards.reduce((acc, rc) => acc + (rc.overall || 0), 0) / reportCards.length * 10) / 10
    : null;

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Background matching homepage theme */}
      <div className="fixed inset-0 -z-10" style={{ pointerEvents: 'none' }}>
        {isDark ? (
          <>
            {/* Dark mode - rich black gradient matching homepage */}
            <div 
              className="absolute inset-0 transition-colors duration-500"
              style={{
                background: 'linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)',
              }}
            />
            {/* Subtle gold atmospheric glow */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)',
              }}
            />
            {/* Galaxy stars */}
            <GalaxyStars />
          </>
        ) : (
          <>
            {/* Light mode - same as homepage */}
            <LightModeBackground />
          </>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground text-center">{error}</p>
              <Button onClick={fetchData} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Welcome Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-heading">
            {t('student.klassroomDashboard')}
          </h1>
          {profile?.public_id && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-mono">ID: {profile.public_id}</span>
            </p>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-16 w-full sm:w-64" />
        ) : instructor && (
          <Card className="w-full sm:w-auto sm:max-w-xs">
            <CardContent className="flex items-center gap-3 p-3 sm:p-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('student.yourInstructor')}</p>
                <p className="font-medium text-sm sm:text-base truncate">{getDisplayName(instructor, t('student.notAssigned'))}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hours Remaining is intentionally hidden from students — only staff/admin/instructors can view */}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold">{upcomingSessions.length}</p>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('student.upcoming')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold">{completedSessions.length}</p>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold">{reportCards.length}</p>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground">Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold">{averageRating ?? '-'}</p>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground">Avg. Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6 mt-6">
        <TabsList className="w-full grid grid-cols-2 gap-2 h-auto p-1 bg-muted/50 backdrop-blur-sm">
          <TabsTrigger 
            value="calendar" 
            className="gap-2 text-sm py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </TabsTrigger>
          <TabsTrigger 
            value="report-cards" 
            className="gap-2 text-sm py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card className="portal-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                All Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SessionCalendar 
                sessions={sessions} 
                userRole="student"
                onSessionUpdate={fetchData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report-cards" className="mt-4">
          <Card className="portal-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Report Cards ({reportCards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportCardList 
                reportCards={reportCards}
                userRole="student"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}