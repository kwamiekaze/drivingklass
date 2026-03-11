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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays, isAfter, isBefore } from "date-fns";
import { Link } from "react-router-dom";
import { getDisplayName, getProfileInitials } from "@/lib/profileUtils";
import { AdminUserProfileModal, ClickableUserName, OpenProfileButton } from "@/components/portal/AdminUserProfileModal";
import {
  ArrowLeft, Search, User, Mail, Phone, RefreshCw, AlertTriangle,
  Clock, Save, Loader2, List, Map as MapIcon, Users, CheckCircle2,
  XCircle, Clock3, MapPin, Filter, X, CalendarIcon, ChevronDown,
  Copy, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy load map
import { lazy, Suspense } from "react";
const StudentMapView = lazy(() => import("@/components/portal/StudentMapView"));

interface StudentProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  approved_at: string | null;
  last_sign_in_at: string | null;
  permit_number: string | null;
  hours_remaining: number;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
}

type SortOption =
  | "approved_newest" | "approved_oldest"
  | "signup_newest" | "signup_oldest"
  | "alpha_az" | "alpha_za"
  | "hours_high" | "hours_low";

type HoursFilter = "all" | "0" | "0.5-2" | "2-6" | "6+";
type AddressFilter = "all" | "has_pickup" | "has_dropoff" | "missing";
type SignInFilter = "all" | "never" | "7days" | "30days" | "over30";

export default function AdminStudents() {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);

  // View toggle
  const [view, setView] = useState<"list" | "map">("list");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");
  const [sortBy, setSortBy] = useState<SortOption>("signup_newest");
  const [hoursFilter, setHoursFilter] = useState<HoursFilter>("all");
  const [addressFilter, setAddressFilter] = useState<AddressFilter>("all");
  const [signInFilter, setSignInFilter] = useState<SignInFilter>("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [approvedDateStart, setApprovedDateStart] = useState<Date | undefined>();
  const [approvedDateEnd, setApprovedDateEnd] = useState<Date | undefined>();
  const [signupDateStart, setSignupDateStart] = useState<Date | undefined>();
  const [signupDateEnd, setSignupDateEnd] = useState<Date | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);

  // Instructor student map for filtering
  const [instructorStudentMap, setInstructorStudentMap] = useState<Record<string, Set<string>>>({});

  // Modals
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StudentProfile | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles").select("user_id").eq("role", "student");
      if (roleError) throw roleError;
      if (!roleData?.length) { setStudents([]); setLoading(false); return; }

      const userIds = roleData.map(r => r.user_id);
      const { data, error: pErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, email, phone, avatar_url, approval_status, created_at, approved_at, last_sign_in_at, permit_number, hours_remaining, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng")
        .in("id", userIds)
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;
      setStudents(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstructors = useCallback(async () => {
    const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "instructor");
    if (!roleData?.length) return;
    const ids = roleData.map(r => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, full_name, email").in("id", ids);
    if (profiles) {
      setInstructors(profiles.map(p => ({ id: p.id, name: getDisplayName(p as any, "Instructor") })));
    }
    // Get instructor-student assignments from sessions
    const { data: sessions } = await supabase
      .from("sessions").select("instructor_id, student_id").in("instructor_id", ids);
    if (sessions) {
      const map: Record<string, Set<string>> = {};
      sessions.forEach(s => {
        if (!map[s.instructor_id]) map[s.instructor_id] = new Set();
        map[s.instructor_id].add(s.student_id);
      });
      setInstructorStudentMap(map);
    }
  }, []);

  useEffect(() => { fetchStudents(); fetchInstructors(); }, [fetchStudents, fetchInstructors]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (sortBy !== "signup_newest") c++;
    if (hoursFilter !== "all") c++;
    if (addressFilter !== "all") c++;
    if (signInFilter !== "all") c++;
    if (instructorFilter !== "all") c++;
    if (approvedDateStart || approvedDateEnd) c++;
    if (signupDateStart || signupDateEnd) c++;
    return c;
  }, [sortBy, hoursFilter, addressFilter, signInFilter, instructorFilter, approvedDateStart, approvedDateEnd, signupDateStart, signupDateEnd]);

  const clearAllFilters = () => {
    setSortBy("signup_newest");
    setHoursFilter("all");
    setAddressFilter("all");
    setSignInFilter("all");
    setInstructorFilter("all");
    setApprovedDateStart(undefined);
    setApprovedDateEnd(undefined);
    setSignupDateStart(undefined);
    setSignupDateEnd(undefined);
  };

  // Filtered + sorted students
  const filteredStudents = useMemo(() => {
    let result = students;

    // Status
    if (statusFilter !== "all") result = result.filter(s => s.approval_status === statusFilter);

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.trim().toLowerCase() || s.full_name?.toLowerCase() || "";
        return name.includes(term) || s.email?.toLowerCase().includes(term) || s.phone?.includes(term) || s.permit_number?.toLowerCase().includes(term);
      });
    }

    // Hours
    if (hoursFilter !== "all") {
      result = result.filter(s => {
        const h = s.hours_remaining ?? 0;
        switch (hoursFilter) {
          case "0": return h === 0;
          case "0.5-2": return h >= 0.5 && h <= 2;
          case "2-6": return h > 2 && h <= 6;
          case "6+": return h > 6;
          default: return true;
        }
      });
    }

    // Address
    if (addressFilter !== "all") {
      result = result.filter(s => {
        switch (addressFilter) {
          case "has_pickup": return !!s.pickup_address;
          case "has_dropoff": return !!s.dropoff_address;
          case "missing": return !s.pickup_address && !s.dropoff_address;
          default: return true;
        }
      });
    }

    // Sign-in
    if (signInFilter !== "all") {
      const now = new Date();
      result = result.filter(s => {
        switch (signInFilter) {
          case "never": return !s.last_sign_in_at;
          case "7days": return s.last_sign_in_at && isAfter(parseISO(s.last_sign_in_at), subDays(now, 7));
          case "30days": return s.last_sign_in_at && isAfter(parseISO(s.last_sign_in_at), subDays(now, 30));
          case "over30": return s.last_sign_in_at && isBefore(parseISO(s.last_sign_in_at), subDays(now, 30));
          default: return true;
        }
      });
    }

    // Instructor
    if (instructorFilter !== "all") {
      const studentSet = instructorStudentMap[instructorFilter];
      if (studentSet) {
        result = result.filter(s => studentSet.has(s.id));
      } else {
        result = [];
      }
    }

    // Approved date range
    if (approvedDateStart || approvedDateEnd) {
      result = result.filter(s => {
        if (!s.approved_at) return false;
        const d = parseISO(s.approved_at);
        if (approvedDateStart && isBefore(d, approvedDateStart)) return false;
        if (approvedDateEnd && isAfter(d, approvedDateEnd)) return false;
        return true;
      });
    }

    // Signup date range
    if (signupDateStart || signupDateEnd) {
      result = result.filter(s => {
        const d = parseISO(s.created_at);
        if (signupDateStart && isBefore(d, signupDateStart)) return false;
        if (signupDateEnd && isAfter(d, signupDateEnd)) return false;
        return true;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "approved_newest": return (b.approved_at || "").localeCompare(a.approved_at || "");
        case "approved_oldest": return (a.approved_at || "").localeCompare(b.approved_at || "");
        case "signup_newest": return b.created_at.localeCompare(a.created_at);
        case "signup_oldest": return a.created_at.localeCompare(b.created_at);
        case "alpha_az": return (getDisplayName(a as any, "ZZZ")).localeCompare(getDisplayName(b as any, "ZZZ"));
        case "alpha_za": return (getDisplayName(b as any, "ZZZ")).localeCompare(getDisplayName(a as any, "ZZZ"));
        case "hours_high": return (b.hours_remaining ?? 0) - (a.hours_remaining ?? 0);
        case "hours_low": return (a.hours_remaining ?? 0) - (b.hours_remaining ?? 0);
        default: return 0;
      }
    });

    return result;
  }, [students, statusFilter, searchTerm, sortBy, hoursFilter, addressFilter, signInFilter, instructorFilter, instructorStudentMap, approvedDateStart, approvedDateEnd, signupDateStart, signupDateEnd]);

  // Stats
  const stats = useMemo(() => {
    const total = students.length;
    const approved = students.filter(s => s.approval_status === "approved").length;
    const pending = students.filter(s => s.approval_status === "pending").length;
    const rejected = students.filter(s => s.approval_status === "rejected").length;
    const mapped = students.filter(s => s.pickup_lat || s.dropoff_lat).length;
    const noAddress = students.filter(s => !s.pickup_address && !s.dropoff_address).length;
    return { total, approved, pending, rejected, mapped, noAddress };
  }, [students]);

  // Hours modal
  const openHoursModal = (user: StudentProfile) => {
    setSelectedUser(user);
    setHoursInput((user.hours_remaining ?? 0).toString());
    setHoursModalOpen(true);
  };
  const handleSaveHours = async () => {
    if (!selectedUser) return;
    const numericHours = parseFloat(hoursInput);
    if (isNaN(numericHours) || numericHours < 0) {
      toast({ title: "Invalid", description: "Enter a valid number", variant: "destructive" });
      return;
    }
    setSavingHours(true);
    const { error } = await supabase.from("profiles").update({ hours_remaining: numericHours }).eq("id", selectedUser.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Hours Updated", description: `Set to ${numericHours.toFixed(1)} hours` });
      setStudents(prev => prev.map(u => u.id === selectedUser.id ? { ...u, hours_remaining: numericHours } : u));
      setHoursModalOpen(false);
    }
    setSavingHours(false);
  };

  const openProfileModal = (userId: string) => {
    setProfileModalUserId(userId);
    setProfileModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case "pending": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Pending</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const DatePickerButton = ({ date, onSelect, placeholder }: { date?: Date; onSelect: (d: Date | undefined) => void; placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left text-xs h-8 w-full", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-1 h-3 w-3" />
          {date ? format(date, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PortalLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Students</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage all student accounts</p>
              </div>
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="gap-1.5 text-xs" onClick={() => setView("list")}>
                <List className="h-3.5 w-3.5" /> List
              </Button>
              <Button variant={view === "map" ? "default" : "ghost"} size="sm" className="gap-1.5 text-xs" onClick={() => setView("map")}>
                <MapIcon className="h-3.5 w-3.5" /> Map
              </Button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {[
              { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
              { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-green-500" },
              { label: "Pending", value: stats.pending, icon: Clock3, color: "text-orange-500" },
              { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500" },
              { label: "Mapped", value: stats.mapped, icon: MapPin, color: "text-blue-500" },
              { label: "No Address", value: stats.noAddress, icon: AlertTriangle, color: "text-muted-foreground" },
            ].map(s => (
              <Card key={s.label} className="portal-card">
                <CardContent className="p-3 text-center">
                  <s.icon className={cn("h-4 w-4 mx-auto mb-1", s.color)} />
                  <div className="text-lg font-bold">{loading ? "–" : s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search + Status + Filters */}
          <Card className="portal-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name, email, phone, permit..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setFiltersOpen(!filtersOpen)} variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && <Badge className="ml-1 h-5 min-w-5 px-1 text-[10px]">{activeFilterCount}</Badge>}
                </Button>
                <Button onClick={fetchStudents} variant="outline" size="icon" className="shrink-0"><RefreshCw className="h-4 w-4" /></Button>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleContent>
                  <div className="border-t pt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Sort */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Sort By</Label>
                        <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border z-50">
                            <SelectItem value="signup_newest">Signed Up (Newest)</SelectItem>
                            <SelectItem value="signup_oldest">Signed Up (Oldest)</SelectItem>
                            <SelectItem value="approved_newest">Approved (Newest)</SelectItem>
                            <SelectItem value="approved_oldest">Approved (Oldest)</SelectItem>
                            <SelectItem value="alpha_az">Alphabetical (A–Z)</SelectItem>
                            <SelectItem value="alpha_za">Alphabetical (Z–A)</SelectItem>
                            <SelectItem value="hours_high">Hours (High → Low)</SelectItem>
                            <SelectItem value="hours_low">Hours (Low → High)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Hours */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Hours Remaining</Label>
                        <Select value={hoursFilter} onValueChange={v => setHoursFilter(v as HoursFilter)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border z-50">
                            <SelectItem value="all">All Hours</SelectItem>
                            <SelectItem value="0">0 hours</SelectItem>
                            <SelectItem value="0.5-2">0.5 – 2 hours</SelectItem>
                            <SelectItem value="2-6">2 – 6 hours</SelectItem>
                            <SelectItem value="6+">6+ hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Address */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <Select value={addressFilter} onValueChange={v => setAddressFilter(v as AddressFilter)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border z-50">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="has_pickup">Has Pickup</SelectItem>
                            <SelectItem value="has_dropoff">Has Dropoff</SelectItem>
                            <SelectItem value="missing">Missing Address</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Last Sign-In */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Last Sign-In</Label>
                        <Select value={signInFilter} onValueChange={v => setSignInFilter(v as SignInFilter)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border z-50">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="never">Never signed in</SelectItem>
                            <SelectItem value="7days">Within 7 days</SelectItem>
                            <SelectItem value="30days">Within 30 days</SelectItem>
                            <SelectItem value="over30">Over 30 days ago</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Instructor */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Instructor</Label>
                        <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border z-50">
                            <SelectItem value="all">All Instructors</SelectItem>
                            {instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Approved Date Range */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Approved Date</Label>
                        <div className="flex gap-1">
                          <DatePickerButton date={approvedDateStart} onSelect={setApprovedDateStart} placeholder="From" />
                          <DatePickerButton date={approvedDateEnd} onSelect={setApprovedDateEnd} placeholder="To" />
                        </div>
                      </div>

                      {/* Signup Date Range */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Signup Date</Label>
                        <div className="flex gap-1">
                          <DatePickerButton date={signupDateStart} onSelect={setSignupDateStart} placeholder="From" />
                          <DatePickerButton date={signupDateEnd} onSelect={setSignupDateEnd} placeholder="To" />
                        </div>
                      </div>
                    </div>

                    {/* Active filter chips + Clear */}
                    {activeFilterCount > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {sortBy !== "signup_newest" && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setSortBy("signup_newest")}>
                            Sort: {sortBy} <X className="h-3 w-3" />
                          </Badge>
                        )}
                        {hoursFilter !== "all" && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setHoursFilter("all")}>
                            Hours: {hoursFilter} <X className="h-3 w-3" />
                          </Badge>
                        )}
                        {addressFilter !== "all" && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setAddressFilter("all")}>
                            Address: {addressFilter} <X className="h-3 w-3" />
                          </Badge>
                        )}
                        {signInFilter !== "all" && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setSignInFilter("all")}>
                            Sign-in: {signInFilter} <X className="h-3 w-3" />
                          </Badge>
                        )}
                        {instructorFilter !== "all" && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setInstructorFilter("all")}>
                            Instructor <X className="h-3 w-3" />
                          </Badge>
                        )}
                        {(approvedDateStart || approvedDateEnd) && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setApprovedDateStart(undefined); setApprovedDateEnd(undefined); }}>
                            Approved date <X className="h-3 w-3" />
                          </Badge>
                        )}
                        {(signupDateStart || signupDateEnd) && (
                          <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setSignupDateStart(undefined); setSignupDateEnd(undefined); }}>
                            Signup date <X className="h-3 w-3" />
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs h-6 text-destructive" onClick={clearAllFilters}>
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Content */}
          {error ? (
            <Card className="portal-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 py-8">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                  <p className="text-muted-foreground text-center">{error}</p>
                  <Button onClick={fetchStudents} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Retry</Button>
                </div>
              </CardContent>
            </Card>
          ) : view === "list" ? (
            /* LIST VIEW */
            <Card className="portal-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Students</span>
                  <Badge variant="secondary">{filteredStudents.length} results</Badge>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center gap-4 p-3 border rounded-xl">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 mb-4 opacity-50" />
                    <p>No students found</p>
                    {(searchTerm || activeFilterCount > 0) && <p className="text-sm mt-1">Try adjusting your search or filters</p>}
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {filteredStudents.map(user => (
                      <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl hover:border-primary/30 transition-colors">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{getProfileInitials(user as any)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <ClickableUserName userId={user.id} name={getDisplayName(user as any, "Unknown")} className="font-medium text-sm sm:text-base truncate" onOpenProfile={openProfileModal} />
                            <OpenProfileButton userId={user.id} onOpenProfile={openProfileModal} className="h-7 w-7" />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                            {user.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{user.email}</span></span>}
                            {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{user.phone}</span>}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-1">
                            <span>Signed up: {format(parseISO(user.created_at), "MMM d, yyyy")}</span>
                            {user.approved_at && <span>Approved: {format(parseISO(user.approved_at), "MMM d, yyyy")}</span>}
                            <span>Last sign-in: {user.last_sign_in_at ? format(parseISO(user.last_sign_in_at), "MMM d, yyyy") : "Never"}</span>
                          </div>
                          {(user.pickup_address || user.dropoff_address) && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{user.pickup_address || user.dropoff_address}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openHoursModal(user)}>
                            <Clock className="h-3 w-3" />{(user.hours_remaining ?? 0).toFixed(1)}h
                          </Button>
                          {getStatusBadge(user.approval_status)}
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => openProfileModal(user.id)}>View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* MAP VIEW */
            <Suspense fallback={
              <Card className="portal-card">
                <CardContent className="p-6 flex items-center justify-center min-h-[500px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            }>
              <StudentMapView
                students={filteredStudents}
                onOpenProfile={openProfileModal}
              />
            </Suspense>
          )}
        </div>

        {/* Hours Editor Modal */}
        <Dialog open={hoursModalOpen} onOpenChange={setHoursModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Hours</DialogTitle>
              <DialogDescription>Set hours for {getDisplayName(selectedUser as any, "student")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Hours Remaining</Label>
                <Input type="number" step="0.5" min="0" value={hoursInput} onChange={e => setHoursInput(e.target.value)} />
              </div>
              <Button onClick={handleSaveHours} disabled={savingHours} className="w-full gap-2">
                {savingHours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Hours
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Modal */}
        <AdminUserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} userId={profileModalUserId} onProfileUpdated={fetchStudents} />
      </PortalLayout>
    </ProtectedRoute>
  );
}
