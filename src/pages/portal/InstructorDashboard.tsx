import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Users, CheckCircle, Clock, Plus, XCircle, Send } from "lucide-react";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { CancelConfirmationModal } from "@/components/portal/CancelConfirmationModal";
import { ProposalBuilder } from "@/components/portal/ProposalBuilder";
import { Session, ReportCard, Profile, InstructorStudent } from "@/types/portal";
import { format, parseISO, isAfter, differenceInHours } from "date-fns";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { ReportCardList } from "@/components/portal/ReportCardList";
import { Link, useNavigate } from "react-router-dom";
import { getDisplayName, getProfileInitials } from "@/lib/profileUtils";
import { useTheme } from "@/components/ThemeProvider";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";
import { useToast } from "@/hooks/use-toast";
import { StudentFullScheduleSection } from "@/components/portal/StudentFullScheduleSection";
import { RoadTestResultModal } from "@/components/portal/RoadTestResultModal";

export default function InstructorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['instructor']}>
      <PortalLayout>
        <InstructorDashboardContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function InstructorDashboardContent() {
  const { profile, user } = usePortalAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [students, setStudents] = useState<InstructorStudent[]>([]);
  const [uniqueStudentCount, setUniqueStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [proposalOpen, setProposalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch sessions with student AND instructor info - instructor's sessions only
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)')
        .eq('instructor_id', user.id)
        .order('starts_at', { ascending: true });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      } else if (sessionsData) {
        setSessions(sessionsData as Session[]);
      }

      // Fetch report cards with explicit FK names
      const { data: reportCardsData, error: reportCardsError } = await supabase
        .from('report_cards')
        .select('*, session:sessions!report_cards_session_id_fkey(*), student:profiles!report_cards_student_id_fkey(*), instructor:profiles!report_cards_instructor_id_fkey(*)')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (reportCardsError) {
        console.error('Error fetching report cards:', reportCardsError);
      } else if (reportCardsData) {
        setReportCards(reportCardsData as ReportCard[]);
      }

      // Fetch assigned students
      const { data: studentsData, error: studentsError } = await supabase
        .from('instructor_students')
        .select('*, student:profiles!instructor_students_student_id_fkey(*)')
        .eq('instructor_id', user.id);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
      } else if (studentsData) {
        setStudents(studentsData as InstructorStudent[]);
      }

      // Compute unique student count from all sessions (not just assignments)
      if (sessionsData) {
        const uniqueIds = new Set(sessionsData.filter((s: any) => s.status !== 'cancelled').map((s: any) => s.student_id));
        setUniqueStudentCount(uniqueIds.size);
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingSessions = sessions.filter(s => 
    s.status === 'scheduled' && isAfter(parseISO(s.starts_at), new Date())
  );

  // Sessions that need attention: past end time, not completed, not cancelled
  const sessionsNeedingReportCard = sessions.filter(s => 
    s.status === 'scheduled' && 
    !s.completed && 
    !isAfter(parseISO(s.ends_at), new Date())
  );

  // All sessions that can have report cards started (scheduled, not cancelled)
  const sessionsForReports = sessions.filter(s => 
    s.status !== 'cancelled'
  );

  // Build a map of session_id -> report card for quick lookup
  const reportCardBySessionId = new Map<string, ReportCard>();
  reportCards.forEach(rc => {
    reportCardBySessionId.set(rc.session_id, rc);
  });

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const fullScheduleStudents = Array.from(
    new Map(
      sessions
        .map((session) => session.student)
        .filter((student): student is Profile => Boolean(student))
        .map((student) => [student.id, student] as const)
    ).values()
  );

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

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-heading">
            Klassroom Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your lessons and students</p>
        </div>
        <Button className="gap-2 min-h-[40px] w-full sm:w-auto" onClick={() => setProposalOpen(true)}>
          <Send className="h-4 w-4" />
          Propose Schedule
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{upcomingSessions.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{uniqueStudentCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Students</p>
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
                <p className="text-xl sm:text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="portal-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{sessionsNeedingReportCard.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Need Report</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions needing report cards */}
      {sessionsNeedingReportCard.length > 0 && (
        <Card className="border-orange-500/50 portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-500 text-base sm:text-lg">
              <Clock className="h-5 w-5" />
              Sessions Needing Report Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {sessionsNeedingReportCard.map(session => {
                const existingReport = reportCardBySessionId.get(session.id);
                return (
                  <NeedingReportCard 
                    key={session.id} 
                    session={session} 
                    existingReport={existingReport}
                    onUpdate={fetchData} 
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm min-h-[40px]">
            <Calendar className="h-4 w-4" />
            <span className="hidden xs:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="report-cards" className="gap-1.5 text-xs sm:text-sm min-h-[40px]">
            <FileText className="h-4 w-4" />
            <span className="hidden xs:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 text-xs sm:text-sm min-h-[40px]">
            <Users className="h-4 w-4" />
            <span className="hidden xs:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="full-schedule" className="gap-1.5 text-xs sm:text-sm min-h-[40px]">
            <Calendar className="h-4 w-4" />
            <span className="hidden xs:inline">Full Schedule</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <SessionCalendar 
            sessions={sessions} 
            userRole="instructor"
            onSessionUpdate={fetchData}
          />
        </TabsContent>

        <TabsContent value="report-cards">
          <ReportCardList 
            reportCards={reportCards}
            userRole="instructor"
            onEdit={(card) => navigate(`/instructor/report-cards/edit/${card.id}`)}
          />
        </TabsContent>

        <TabsContent value="students">
          <Card className="portal-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-5 w-5" />
                My Students ({uniqueStudentCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Link to="/instructor/students">
                  <Button className="gap-2">
                    <Users className="h-4 w-4" />
                    View All Students
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-2">
                  View, search, and filter all students you've worked with
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full-schedule">
          <StudentFullScheduleSection
            students={fullScheduleStudents}
            currentUserId={user?.id}
          />
        </TabsContent>
      </Tabs>

      <ProposalBuilder
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        onProposalSent={fetchData}
      />
    </div>
  );
}

function NeedingReportCard({ session, existingReport, onUpdate }: { session: Session; existingReport?: ReportCard; onUpdate: () => void }) {
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async (reason: string, waiveFee?: boolean, suppressStudentNotification?: boolean) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-session-with-penalty', {
        body: { session_id: session.id, reason: reason.trim(), waive_fee: waiveFee || false, suppress_student_notification: suppressStudentNotification || false }
      });
      if (error) throw error;
      let desc = "The session has been cancelled successfully.";
      if (data?.fee_waived) desc += " Late cancellation fee was waived.";
      else if (data?.penalty_applied) desc += " A 30 minute reduction was applied.";
      toast({ title: "Session Cancelled", description: desc });
      setCancelOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to cancel session", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  // Determine button label and route based on report card status
  const getReportButton = () => {
    if (existingReport) {
      const status = existingReport.report_card_status;
      if (status === 'completed') {
        return { label: 'View Report', route: `/report-cards/open/${existingReport.id}`, icon: <FileText className="h-4 w-4" /> };
      }
      return { label: 'Continue Report', route: `/instructor/report-cards/edit/${existingReport.id}`, icon: <FileText className="h-4 w-4" /> };
    }
    return { 
      label: session.session_type === 'testing' ? 'Grade Road Test' : 'Start Report', 
      route: `/instructor/report-cards/new?session_id=${session.id}`, 
      icon: <Plus className="h-4 w-4" /> 
    };
  };

  const reportBtn = getReportButton();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 border rounded-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm sm:text-base truncate">{getDisplayName(session.student, 'Student')}</p>
            <SessionTypeBadge sessionType={session.session_type} />
            {existingReport && existingReport.report_card_status !== 'completed' && (
              <Badge variant="secondary" className={
                existingReport.report_card_status === 'draft' 
                  ? 'bg-muted text-muted-foreground text-[10px]' 
                  : 'bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px]'
              }>
                {existingReport.report_card_status === 'draft' ? 'Draft' : 'In Progress'}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {format(parseISO(session.starts_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Link to={reportBtn.route} className="flex-1 sm:flex-initial">
            <Button size="sm" className="gap-2 w-full min-h-[40px]">
              {reportBtn.icon}
              {reportBtn.label}
            </Button>
          </Link>
          {session.status === 'scheduled' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2 flex-1 sm:flex-initial min-h-[40px]"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { error } = await supabase.rpc('complete_session', { _session_id: session.id, _via: 'manual' });
                    if (error) throw error;
                    toast({ title: "Session Completed", description: "Marked as completed and hours deducted." });
                    onUpdate();
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message || "Failed to complete", variant: "destructive" });
                  } finally { setIsLoading(false); }
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Mark Complete
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-2 flex-1 sm:flex-initial min-h-[40px]"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      <CancelConfirmationModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        sessionStartsAt={session.starts_at}
        sessionEndsAt={session.ends_at}
        studentName={getDisplayName(session.student, 'Student')}
        instructorName={getDisplayName(session.instructor, 'Instructor')}
        userRole="instructor"
        onConfirmCancel={handleCancel}
        isLoading={isLoading}
      />
    </>
  );
}