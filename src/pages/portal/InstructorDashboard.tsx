import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Users, CheckCircle, Clock, Plus, XCircle } from "lucide-react";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { CancelConfirmationModal } from "@/components/portal/CancelConfirmationModal";
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

  const sessionsNeedingReportCard = sessions.filter(s => 
    s.status === 'scheduled' && 
    !s.completed && 
    !isAfter(parseISO(s.ends_at), new Date())
  );

  const completedSessions = sessions.filter(s => s.status === 'completed');

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">
          Klassroom Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your lessons and students</p>
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
              {sessionsNeedingReportCard.slice(0, 5).map(session => (
                <NeedingReportCard key={session.id} session={session} onUpdate={fetchData} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
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
                Assigned Students ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  No students assigned yet
                </p>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  {students.map(assignment => (
                    <Link 
                      key={assignment.id} 
                      to={`/instructor/students/${assignment.student_id}`}
                    >
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <span className="text-base sm:text-lg font-bold text-primary">
                                {getProfileInitials(assignment.student)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">
                                {getDisplayName(assignment.student, 'Student')}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {assignment.student?.public_id || assignment.student?.email}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NeedingReportCard({ session, onUpdate }: { session: Session; onUpdate: () => void }) {
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async (reason: string, waiveFee?: boolean) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-session-with-penalty', {
        body: { session_id: session.id, reason: reason.trim(), waive_fee: waiveFee || false }
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

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 border rounded-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm sm:text-base truncate">{getDisplayName(session.student, 'Student')}</p>
            <SessionTypeBadge sessionType={session.session_type} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {format(parseISO(session.starts_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link to={`/instructor/report-cards/new?session_id=${session.id}`} className="flex-1 sm:flex-initial">
            <Button size="sm" className="gap-2 w-full min-h-[40px]">
              <Plus className="h-4 w-4" />
              {session.session_type === 'testing' ? 'Grade Road Test' : 'Create Report'}
            </Button>
          </Link>
          <Button
            size="sm"
            variant="destructive"
            className="gap-2 flex-1 sm:flex-initial min-h-[40px]"
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
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