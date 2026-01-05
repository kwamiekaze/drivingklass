import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, FileText, CheckCircle, AlertTriangle, UserPlus, BarChart3 } from "lucide-react";
import { Profile, Session, ReportCard } from "@/types/portal";
import { Link } from "react-router-dom";
import { isAfter, parseISO, startOfDay, subDays } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";

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
    // Pending approvals: single source of truth = approval_status = 'pending'
    const { count: pendingCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    // Total students (by role)
    const { count: studentCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    // Total instructors (by role)
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

    // Fetch recent activity with same filter as count (approval_status = 'pending')
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending')
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
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, count: 0, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  ];

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