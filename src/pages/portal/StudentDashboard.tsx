import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, CheckCircle, Clock, User, AlertTriangle } from "lucide-react";
import { Session, ReportCard, Profile } from "@/types/portal";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { ReportCardList } from "@/components/portal/ReportCardList";
import { Link } from "react-router-dom";

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [instructor, setInstructor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    // Fetch sessions with instructor info
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, instructor:profiles!sessions_instructor_id_fkey(*)')
      .eq('student_id', user.id)
      .order('starts_at', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData as Session[]);
    }

    // Fetch report cards (excluding internal_message for students)
    const { data: reportCardsData } = await supabase
      .from('report_cards')
      .select('*, session:sessions(*), instructor:profiles!report_cards_instructor_id_fkey(*)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (reportCardsData) {
      // Remove internal_message from student view
      const sanitized = reportCardsData.map(rc => ({
        ...rc,
        internal_message: null
      }));
      setReportCards(sanitized as ReportCard[]);
    }

    // Fetch assigned instructor
    const { data: assignmentData } = await supabase
      .from('instructor_students')
      .select('instructor:profiles!instructor_students_instructor_id_fkey(*)')
      .eq('student_id', user.id)
      .maybeSingle();

    if (assignmentData?.instructor) {
      setInstructor(assignmentData.instructor as Profile);
    }

    setLoading(false);
  };

  const upcomingSessions = sessions.filter(s => 
    s.status === 'scheduled' && isAfter(parseISO(s.starts_at), new Date())
  );

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const averageRating = reportCards.length > 0 
    ? Math.round(reportCards.reduce((acc, rc) => acc + (rc.overall || 0), 0) / reportCards.length * 10) / 10
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold theme-heading">
            Welcome, {profile?.full_name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            {profile?.public_id && (
              <span className="font-mono">ID: {profile.public_id}</span>
            )}
          </p>
        </div>
        {instructor && (
          <Card className="md:w-auto">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Your Instructor</p>
                <p className="font-medium">{instructor.full_name}</p>
              </div>
            </CardContent>
          </Card>
        )}
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
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{reportCards.length}</p>
                <p className="text-xs text-muted-foreground">Report Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{averageRating ?? '-'}</p>
                <p className="text-xs text-muted-foreground">Avg. Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
        </TabsList>

        <TabsContent value="calendar">
          <SessionCalendar 
            sessions={sessions} 
            userRole="student"
            onSessionUpdate={fetchData}
          />
        </TabsContent>

        <TabsContent value="report-cards">
          <ReportCardList 
            reportCards={reportCards}
            userRole="student"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
