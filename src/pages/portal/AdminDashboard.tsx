import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, FileText, CheckCircle, Clock, AlertTriangle, UserPlus } from "lucide-react";
import { Profile, Session, ReportCard } from "@/types/portal";
import { Link } from "react-router-dom";
import { isAfter, parseISO, startOfDay, subDays } from "date-fns";

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
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
    { href: '/admin/approvals', label: 'Approvals', icon: UserPlus, count: stats.pendingApprovals, color: 'text-orange-500' },
    { href: '/admin/schedule', label: 'Schedule', icon: Calendar, count: stats.upcomingSessions, color: 'text-blue-500' },
    { href: '/admin/report-cards', label: 'Report Cards', icon: FileText, count: stats.recentReportCards, color: 'text-green-500' },
    { href: '/admin/users/students', label: 'Students', icon: Users, count: stats.totalStudents, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold theme-heading">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className={stats.pendingApprovals > 0 ? 'border-orange-500/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalInstructors}</p>
                <p className="text-xs text-muted-foreground">Instructors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.upcomingSessions}</p>
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
                <p className="text-2xl font-bold">{stats.completedToday}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.recentReportCards}</p>
                <p className="text-xs text-muted-foreground">Reports/Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickLinks.map(link => (
          <Link key={link.href} to={link.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <link.icon className={`h-8 w-8 ${link.color} mb-2`} />
                <p className="font-medium">{link.label}</p>
                {link.count > 0 && (
                  <Badge variant="secondary" className="mt-1">
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
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{profile.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.intake_submitted ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Intake Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Awaiting Intake</Badge>
                    )}
                    <Link to="/admin/approvals">
                      <Badge className="cursor-pointer">Review</Badge>
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
