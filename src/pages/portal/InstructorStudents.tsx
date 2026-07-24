import { useState, useEffect, useMemo, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isAfter } from "date-fns";
import { Link } from "react-router-dom";
import { getDisplayName, getProfileInitials } from "@/lib/profileUtils";
import {
  ArrowLeft, Search, User, Mail, Phone, Clock, Users, Filter, X, ChevronDown, Calendar, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/ThemeProvider";
import { DarkModeBackground } from "@/components/DarkModeBackground";
import { LightModeBackground } from "@/components/LightModeBackground";

interface InstructorStudentProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  hours_remaining: number;
  pickup_address: string | null;
  created_at: string;
  // Computed
  relationshipLabel: string;
  lastSessionDate: string | null;
  nextSessionDate: string | null;
}

type SortOption = "alpha_az" | "alpha_za" | "signup_newest" | "signup_oldest" | "next_session" | "last_session" | "hours_high" | "hours_low";
type SessionFilter = "all" | "has_upcoming" | "no_upcoming" | "hours_gt0" | "hours_0";

export default function InstructorStudents() {
  const { user } = usePortalAuth();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [students, setStudents] = useState<InstructorStudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alpha_az");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get all sessions for this instructor
      const { data: sessions } = await supabase
        .from("sessions")
        .select("student_id, starts_at, status")
        .eq("instructor_id", user.id)
        .neq("status", "cancelled");

      if (!sessions?.length) { setStudents([]); setLoading(false); return; }

      // Get unique student IDs
      const studentIds = [...new Set(sessions.map(s => s.student_id))];

      // Get assigned students
      const { data: assignments } = await supabase
        .from("instructor_students")
        .select("student_id")
        .eq("instructor_id", user.id);

      const assignedSet = new Set(assignments?.map(a => a.student_id) || []);

      // Compute per-student session info
      const now = new Date();
      const studentSessionMap: Record<string, { lastSession: string | null; nextSession: string | null; hasUpcoming: boolean }> = {};

      studentIds.forEach(sid => {
        const studentSessions = sessions.filter(s => s.student_id === sid);
        const past = studentSessions.filter(s => !isAfter(parseISO(s.starts_at), now)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
        const upcoming = studentSessions.filter(s => isAfter(parseISO(s.starts_at), now) && s.status === "scheduled").sort((a, b) => a.starts_at.localeCompare(b.starts_at));

        studentSessionMap[sid] = {
          lastSession: past[0]?.starts_at || null,
          nextSession: upcoming[0]?.starts_at || null,
          hasUpcoming: upcoming.length > 0,
        };
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, email, phone, avatar_url, hours_remaining, pickup_address, created_at")
        .in("id", studentIds);

      if (profiles) {
        const enriched: InstructorStudentProfile[] = profiles.map(p => {
          const info = studentSessionMap[p.id] || { lastSession: null, nextSession: null, hasUpcoming: false };
          let label = "Worked With You";
          if (assignedSet.has(p.id)) label = "Assigned to You";
          else if (info.hasUpcoming) label = "Scheduled With You";

          return {
            ...p,
            relationshipLabel: label,
            lastSessionDate: info.lastSession,
            nextSessionDate: info.nextSession,
          };
        });
        setStudents(enriched);
      }
    } catch (err) {
      console.error("Error fetching instructor students:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.trim().toLowerCase() || s.full_name?.toLowerCase() || "";
        return name.includes(term) || s.email?.toLowerCase().includes(term) || s.phone?.includes(term);
      });
    }

    switch (sessionFilter) {
      case "has_upcoming": result = result.filter(s => s.nextSessionDate); break;
      case "no_upcoming": result = result.filter(s => !s.nextSessionDate); break;
      case "hours_gt0": result = result.filter(s => (s.hours_remaining ?? 0) > 0); break;
      case "hours_0": result = result.filter(s => (s.hours_remaining ?? 0) === 0); break;
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "alpha_az": return getDisplayName(a as any, "ZZZ").localeCompare(getDisplayName(b as any, "ZZZ"));
        case "alpha_za": return getDisplayName(b as any, "ZZZ").localeCompare(getDisplayName(a as any, "ZZZ"));
        case "signup_newest": return b.created_at.localeCompare(a.created_at);
        case "signup_oldest": return a.created_at.localeCompare(b.created_at);
        case "next_session": return (a.nextSessionDate || "9999").localeCompare(b.nextSessionDate || "9999");
        case "last_session": return (b.lastSessionDate || "").localeCompare(a.lastSessionDate || "");
        case "hours_high": return (b.hours_remaining ?? 0) - (a.hours_remaining ?? 0);
        case "hours_low": return (a.hours_remaining ?? 0) - (b.hours_remaining ?? 0);
        default: return 0;
      }
    });

    return result;
  }, [students, searchTerm, sortBy, sessionFilter]);

  const activeFilterCount = (sortBy !== "alpha_az" ? 1 : 0) + (sessionFilter !== "all" ? 1 : 0);

  const getLabelBadge = (label: string) => {
    switch (label) {
      case "Assigned to You": return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Assigned to You</Badge>;
      case "Scheduled With You": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">Scheduled With You</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">Worked With You</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["instructor"]}>
      <PortalLayout>
        <div className="space-y-4 sm:space-y-6 relative">
          <div className="fixed inset-0 -z-10" style={{ pointerEvents: "none" }}>
            {isDark ? (
              <>
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)" }} />
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)" }} />
                <DarkModeBackground />
              </>
            ) : <LightModeBackground />}
          </div>

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/instructor">
              <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold theme-heading">My Students</h1>
              <p className="text-sm text-muted-foreground mt-1">Students you've taught or are scheduled with</p>
            </div>
          </div>

          {/* Search & Filters */}
          <Card className="portal-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name, email, phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Button onClick={() => setFiltersOpen(!filtersOpen)} variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && <Badge className="ml-1 h-5 min-w-5 px-1 text-[10px]">{activeFilterCount}</Badge>}
                </Button>
              </div>

              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleContent>
                  <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Sort By</label>
                      <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border z-50">
                          <SelectItem value="alpha_az">Name (A–Z)</SelectItem>
                          <SelectItem value="alpha_za">Name (Z–A)</SelectItem>
                          <SelectItem value="signup_newest">Newest Signup</SelectItem>
                          <SelectItem value="signup_oldest">Oldest Signup</SelectItem>
                          <SelectItem value="next_session">Next Session</SelectItem>
                          <SelectItem value="last_session">Last Session</SelectItem>
                          <SelectItem value="hours_high">Hours (High → Low)</SelectItem>
                          <SelectItem value="hours_low">Hours (Low → High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Filter</label>
                      <Select value={sessionFilter} onValueChange={v => setSessionFilter(v as SessionFilter)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border z-50">
                          <SelectItem value="all">All Students</SelectItem>
                          <SelectItem value="has_upcoming">Has Upcoming Sessions</SelectItem>
                          <SelectItem value="no_upcoming">No Upcoming Sessions</SelectItem>
                          <SelectItem value="hours_gt0">Hours &gt; 0</SelectItem>
                          <SelectItem value="hours_0">Hours = 0</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="ghost" size="sm" className="text-xs h-6 text-destructive" onClick={() => { setSortBy("alpha_az"); setSessionFilter("all"); }}>
                        <X className="h-3 w-3 mr-1" /> Clear All
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Student List */}
          <Card className="portal-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Students</span>
                <Badge variant="secondary">{filteredStudents.length} total</Badge>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-xl">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                    </div>
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mb-4 opacity-50" />
                  <p>No students found</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {filteredStudents.map(student => (
                    <Link key={student.id} to={`/instructor/students/${student.id}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl hover:border-primary/30 transition-colors cursor-pointer">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={student.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{getProfileInitials(student as any)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm sm:text-base truncate">{getDisplayName(student as any, "Student")}</span>
                            {getLabelBadge(student.relationshipLabel)}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
                            {student.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{student.email}</span></span>}
                            {student.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{student.phone}</span>}
                          </div>
                          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-1">
                            {student.lastSessionDate && (
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Last: {format(parseISO(student.lastSessionDate), "MMM d, yyyy")}</span>
                            )}
                            {student.nextSessionDate && (
                              <span className="flex items-center gap-1 text-primary"><Calendar className="h-3 w-3" />Next: {format(parseISO(student.nextSessionDate), "MMM d, yyyy")}</span>
                            )}
                            {student.pickup_address && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{student.pickup_address}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />{(student.hours_remaining ?? 0).toFixed(1)}h
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}
