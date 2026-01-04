import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, FileText, CheckCircle, AlertTriangle, UserPlus } from "lucide-react";
import { Profile, Session, ReportCard } from "@/types/portal";
import { Link } from "react-router-dom";
import { isAfter, parseISO, startOfDay, subDays } from "date-fns";

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PortalLayout>
        <AdminDashboardContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminDashboardContent() {
  const { profile } = usePortalAuth();
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    totalStudents: 0,
    totalInstructors: 0,
    upcomingSessions: 0,
    completedToday: 0,
    recentReportCards: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Pending approvals
    const { count: pendingCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false);

    // Total students
    const { count: studentCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    // Total instructors
    const { count: instructorCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'instructor');

    // Upcoming sessions
    const { count: upcomingCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString());

    // Completed today
    const today = startOfDay(new Date());
    const { count: completedCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('starts_at', today.toISOString());

    // Recent report cards (last 7 days)
    const weekAgo = subDays(new Date(), 7);
    const { count: reportCount } = await supabase
      .from('report_cards')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    setStats({
      pendingApprovals: pendingCount || 0,
      totalStudents: studentCount || 0,
      totalInstructors: instructorCount || 0,
      upcomingSessions: upcomingCount || 0,
      completedToday: completedCount || 0,
      recentReportCards: reportCount || 0,
    });

    // Fetch recent activity
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('intake_submitted', true)
      .eq('approved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentActivity(recentProfiles || []);
    setLoading(false);
  };

  const quickLinks = [
    { href: '/admin/approvals', label: 'Approvals', icon: UserPlus, count: stats.pendingApprovals, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { href: '/admin/students', label: 'Students', icon: Users, count: stats.totalStudents, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { href: '/admin/instructors', label: 'Instructors', icon: Users, count: stats.totalInstructors, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { href: '/admin/schedule', label: 'Schedule', icon: Calendar, count: stats.upcomingSessions, color: 'text-primary', bgColor: 'bg-primary/10' },
    { href: '/admin/report-cards', label: 'Reports', icon: FileText, count: stats.recentReportCards, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { href: '/admin/assignments', label: 'Assignments', icon: Users, count: 0, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">
          Admin Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}
        </p>
      </div>

      {/* Quick Links */}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {quickLinks.map(link => (
          <Link key={link.href} to={link.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full portal-card">
              <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${link.bgColor} flex items-center justify-center mb-2 sm:mb-3`}>
                  <link.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${link.color}`} />
                </div>
                <p className="font-medium text-sm sm:text-base">{link.label}</p>
                {link.count > 0 && (
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {link.count}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pending Approvals */}
      {recentActivity.length > 0 && (
        <Card className="border-orange-500/50 portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {recentActivity.map(profile => (
                <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 border rounded-xl">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{profile.full_name || 'Unknown'}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {profile.intake_submitted ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Intake Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Awaiting Intake</Badge>
                    )}
                    <Link to="/admin/approvals">
                      <Badge className="cursor-pointer text-xs">Review</Badge>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}