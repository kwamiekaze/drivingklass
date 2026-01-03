import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Users, CheckCircle, Clock, Plus } from "lucide-react";
import { Session, ReportCard, Profile, InstructorStudent } from "@/types/portal";
import { format, parseISO, isAfter } from "date-fns";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { ReportCardList } from "@/components/portal/ReportCardList";
import { Link, useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    // Fetch sessions with student info
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, student:profiles!sessions_student_id_fkey(*)')
      .eq('instructor_id', user.id)
      .order('starts_at', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData as Session[]);
    }

    // Fetch report cards
    const { data: reportCardsData } = await supabase
      .from('report_cards')
      .select('*, session:sessions(*), student:profiles!report_cards_student_id_fkey(*)')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false });

    if (reportCardsData) {
      setReportCards(reportCardsData as ReportCard[]);
    }

    // Fetch assigned students
    const { data: studentsData } = await supabase
      .from('instructor_students')
      .select('*, student:profiles!instructor_students_student_id_fkey(*)')
      .eq('instructor_id', user.id);

    if (studentsData) {
      setStudents(studentsData as InstructorStudent[]);
    }

    setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold theme-heading">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Instructor'}!
        </h1>
        <p className="text-muted-foreground">Manage your lessons and students</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{upcomingSessions.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{sessionsNeedingReportCard.length}</p>
                <p className="text-xs text-muted-foreground">Need Report</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions needing report cards */}
      {sessionsNeedingReportCard.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Clock className="h-5 w-5" />
              Sessions Needing Report Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessionsNeedingReportCard.slice(0, 5).map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{session.student?.full_name || 'Student'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(session.starts_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Link to={`/instructor/report-cards/new?session_id=${session.id}`}>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Report
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="report-cards" className="gap-2">
            <FileText className="h-4 w-4" />
            Report Cards
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            Students
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assigned Students ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No students assigned yet
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {students.map(assignment => (
                    <Link 
                      key={assignment.id} 
                      to={`/instructor/students/${assignment.student_id}`}
                    >
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">
                                {assignment.student?.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{assignment.student?.full_name || 'Student'}</p>
                              <p className="text-sm text-muted-foreground">
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
