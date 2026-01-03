import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, Eye, Edit, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { ReportCard, Profile, RATING_CATEGORIES } from "@/types/portal";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export default function AdminReportCards() {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
      <PortalLayout>
        <AdminReportCardsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminReportCardsContent() {
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [instructorFilter, setInstructorFilter] = useState<string>("all");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all report cards
    const { data: reportCardsData } = await supabase
      .from('report_cards')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch all profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*');

    // Separate students and instructors
    const { data: studentRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    const { data: instructorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'instructor');

    const studentIds = new Set(studentRoles?.map(r => r.user_id) || []);
    const instructorIds = new Set(instructorRoles?.map(r => r.user_id) || []);

    setStudents(profilesData?.filter(p => studentIds.has(p.id)) || []);
    setInstructors(profilesData?.filter(p => instructorIds.has(p.id)) || []);
    setReportCards(reportCardsData || []);
    setLoading(false);
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.full_name || 'Unknown';
  const getInstructorName = (id: string) => instructors.find(i => i.id === id)?.full_name || 'Unknown';

  const filteredReportCards = reportCards.filter(rc => {
    // Search filter
    if (searchQuery) {
      const studentName = getStudentName(rc.student_id).toLowerCase();
      const instructorName = getInstructorName(rc.instructor_id).toLowerCase();
      const query = searchQuery.toLowerCase();
      if (!studentName.includes(query) && !instructorName.includes(query)) {
        return false;
      }
    }

    // Student filter
    if (studentFilter !== "all" && rc.student_id !== studentFilter) {
      return false;
    }

    // Instructor filter
    if (instructorFilter !== "all" && rc.instructor_id !== instructorFilter) {
      return false;
    }

    return true;
  });

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'bg-muted text-muted-foreground';
    if (rating >= 4) return 'bg-green-500/20 text-green-700 dark:text-green-300';
    if (rating >= 3) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
    return 'bg-red-500/20 text-red-700 dark:text-red-300';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">All Report Cards</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">View and manage all student report cards</p>
      </div>

      {/* Filters */}
      <Card className="portal-card">
        <CardContent className="p-3 sm:p-4">
          {/* Mobile: Collapsible filters */}
          <div className="sm:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            <Button 
              variant="outline" 
              className="w-full gap-2 min-h-[44px]" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {showFilters && (
              <div className="space-y-3">
                <Select value={studentFilter} onValueChange={setStudentFilter}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Filter by student" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Filter by instructor" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Instructors</SelectItem>
                    {instructors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Desktop: Inline filters */}
          <div className="hidden sm:flex flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by student" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                <SelectItem value="all">All Students</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={instructorFilter} onValueChange={setInstructorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by instructor" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                <SelectItem value="all">All Instructors</SelectItem>
                {instructors.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredReportCards.length === 0 ? (
          <Card className="portal-card">
            <CardContent className="py-8 sm:py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No report cards found</p>
            </CardContent>
          </Card>
        ) : (
          filteredReportCards.map(rc => (
            <Card key={rc.id} className="portal-card overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors p-3 sm:p-4"
                onClick={() => setExpandedCard(expandedCard === rc.id ? null : rc.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">{getStudentName(rc.student_id)}</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        Instructor: {getInstructorName(rc.instructor_id)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 ml-12 sm:ml-0">
                    <Badge className={`${getRatingColor(rc.overall)} text-xs`}>
                      Overall: {rc.overall || 'N/A'}
                    </Badge>
                    <div className="hidden xs:flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      {format(parseISO(rc.created_at!), 'MMM d, yyyy')}
                    </div>
                    <Link to={`/instructor/report-cards/edit/${rc.id}`} onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              
              {expandedCard === rc.id && (
                <CardContent className="border-t p-3 sm:p-4">
                  {/* Ratings Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                    {RATING_CATEGORIES.map(category => {
                      const rating = rc[category.key as keyof ReportCard] as number | null;
                      return (
                        <div
                          key={category.key}
                          className={`p-2 rounded text-center ${getRatingColor(rating)}`}
                        >
                          <p className="text-[10px] sm:text-xs font-medium truncate">{category.label}</p>
                          <p className="text-sm sm:text-lg font-bold">{rating || '-'}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Messages */}
                  {rc.message_to_student && (
                    <div className="bg-muted p-3 rounded-lg mb-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Message to Student</p>
                      <p className="text-xs sm:text-sm">{rc.message_to_student}</p>
                    </div>
                  )}
                  {rc.internal_message && (
                    <div className="bg-orange-500/10 p-3 rounded-lg">
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Internal Note</p>
                      <p className="text-xs sm:text-sm">{rc.internal_message}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <Card className="portal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">{filteredReportCards.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Reports</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">
                {filteredReportCards.length > 0
                  ? (filteredReportCards.reduce((sum, rc) => sum + (rc.overall || 0), 0) / filteredReportCards.length).toFixed(1)
                  : '-'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Avg. Overall</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">
                {new Set(filteredReportCards.map(rc => rc.student_id)).size}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Students</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">
                {new Set(filteredReportCards.map(rc => rc.instructor_id)).size}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Instructors</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}