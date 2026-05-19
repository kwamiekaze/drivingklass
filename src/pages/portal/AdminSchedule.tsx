import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, User, Ban, Trash2 } from "lucide-react";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { format } from "date-fns";
import { Session, Profile } from "@/types/portal";
import { toast } from "sonner";
import { getDisplayName } from "@/lib/profileUtils";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { StudentPickerModal } from "@/components/portal/StudentPickerModal";
import type { CalendarEvent } from "@/components/portal/FullCalendarView";

export default function AdminSchedule() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <PortalLayout>
        <AdminScheduleContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminScheduleContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any | null>(null);

  // Filters
  const [filterInstructor, setFilterInstructor] = useState<string>("all");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    instructor_id: "",
    date: "",
    start_time: "",
    duration_minutes: "120",
    session_type: "driving",
    pickup_address: "",
    dropoff_address: "",
  });

  // Block form state
  const [blockForm, setBlockForm] = useState({
    title: "Unavailable",
    notes: "",
    date: "",
    start_time: "",
    duration_minutes: "60",
    instructor_id: "all",
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)')
      .order('starts_at', { ascending: true });
    setSessions((sessionsData || []) as Session[]);

    const { data: studentRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
    if (studentRoles && studentRoles.length > 0) {
      const { data: studentProfiles } = await supabase.from('profiles')
        .select('id, first_name, last_name, full_name, email, phone, approval_status, approved_at, hours_remaining, last_sign_in_at, pickup_address, dropoff_address, created_at, updated_at, approved, intake_submitted, public_id, permit_number, permit_issue_date, permit_expiration_date, guardian_name, guardian_phone, guardian_email, permit_file_url')
        .in('id', studentRoles.map(r => r.user_id))
        .eq('approval_status', 'approved');
      setStudents((studentProfiles || []) as Profile[]);
    } else { setStudents([]); }

    const { data: instructorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'instructor');
    if (instructorRoles && instructorRoles.length > 0) {
      const { data: instructorProfiles } = await supabase.from('profiles').select('*').in('id', instructorRoles.map(r => r.user_id)).eq('approval_status', 'approved');
      setInstructors((instructorProfiles || []) as Profile[]);
    } else { setInstructors([]); }

    const { data: blockData } = await (supabase as any)
      .from('schedule_blocks')
      .select('*')
      .order('starts_at', { ascending: true });
    setBlocks(blockData || []);

    setLoading(false);
  };

  // When a student is selected, prefill their pickup/dropoff
  const handleStudentSelect = (student: Profile) => {
    setFormData(f => ({
      ...f,
      student_id: student.id,
      pickup_address: student.pickup_address || "",
      dropoff_address: student.dropoff_address || "",
    }));
  };

  const selectedStudent = useMemo(
    () => students.find(s => s.id === formData.student_id),
    [students, formData.student_id]
  );

  const handleCreateSession = async () => {
    if (!formData.student_id || !formData.instructor_id || !formData.date || !formData.start_time) {
      toast.error("Please fill in all required fields");
      return;
    }
    const startsAt = new Date(`${formData.date}T${formData.start_time}`);
    const durationMinutes = parseInt(formData.duration_minutes);

    const { data: newSession, error } = await supabase.rpc('create_session_admin', {
      _student_id: formData.student_id,
      _instructor_id: formData.instructor_id,
      _starts_at: startsAt.toISOString(),
      _duration_minutes: durationMinutes,
    });

    if (error) {
      toast.error(`Failed to create session: ${error.message}`);
      return;
    }

    // Update session type and addresses if needed
    const updates: Record<string, any> = {};
    if (formData.session_type !== 'driving') updates.session_type = formData.session_type;
    if (formData.pickup_address.trim()) updates.pickup_address = formData.pickup_address.trim();
    if (formData.dropoff_address.trim()) updates.dropoff_address = formData.dropoff_address.trim();

    if (Object.keys(updates).length > 0 && newSession?.id) {
      await supabase.from('sessions').update(updates).eq('id', newSession.id);
    }

    toast.success("Session created successfully");
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({ student_id: "", instructor_id: "", date: "", start_time: "", duration_minutes: "120", session_type: "driving", pickup_address: "", dropoff_address: "" });
  };

  const openCreateFromSlot = (date: Date) => {
    setFormData(f => ({
      ...f,
      date: format(date, 'yyyy-MM-dd'),
      start_time: format(date, 'HH:mm'),
    }));
    setEditingSession(null);
    setDialogOpen(true);
  };

  // Apply filters
  const filteredSessions = sessions.filter(s => {
    if (filterInstructor !== 'all' && s.instructor_id !== filterInstructor) return false;
    if (filterStudent !== 'all' && s.student_id !== filterStudent) return false;
    if (filterType !== 'all' && s.session_type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const activeFilterCount = [filterInstructor, filterStudent, filterType, filterStatus].filter(f => f !== 'all').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Schedule Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length} total sessions • {sessions.filter(s => s.status === 'scheduled').length} scheduled
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5 min-h-[40px]"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingSession(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 min-h-[40px]">
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>{editingSession ? 'Edit Session' : 'Create New Session'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Student Picker */}
                <div className="space-y-2">
                  <Label className="text-sm">Student</Label>
                  <button
                    type="button"
                    onClick={() => setStudentPickerOpen(true)}
                    className="w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent/30 transition-colors text-left"
                  >
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    {selectedStudent ? (
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{getDisplayName(selectedStudent, 'Unknown')}</span>
                        {selectedStudent.email && (
                          <span className="text-muted-foreground ml-2 text-xs">{selectedStudent.email}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select student...</span>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Instructor</Label>
                  <Select value={formData.instructor_id} onValueChange={v => setFormData(f => ({ ...f, instructor_id: v }))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select instructor" /></SelectTrigger>
                    <SelectContent className="bg-popover border z-50">
                      {instructors.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No approved instructors</div>
                      ) : instructors.map(i => (
                        <SelectItem key={i.id} value={i.id}>{getDisplayName(i, 'Unknown')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))} className="min-h-[44px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Start Time</Label>
                    <Select value={formData.start_time} onValueChange={v => setFormData(f => ({ ...f, start_time: v }))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent className="bg-popover border z-50 max-h-[300px]">
                        {Array.from({ length: 48 }, (_, i) => {
                          const hours = Math.floor(i / 2);
                          const mins = (i % 2) * 30;
                          const timeValue = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                          const ampm = hours < 12 ? 'AM' : 'PM';
                          return <SelectItem key={timeValue} value={timeValue}>{`${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Duration</Label>
                    <Select value={formData.duration_minutes} onValueChange={v => setFormData(f => ({ ...f, duration_minutes: v }))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Session Type</Label>
                    <Select value={formData.session_type} onValueChange={v => setFormData(f => ({ ...f, session_type: v }))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="driving">Driving Session</SelectItem>
                        <SelectItem value="testing">Road Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pickup / Drop-off */}
                <div className="space-y-2">
                  <Label className="text-sm">Pickup Address</Label>
                  <Input
                    placeholder="Enter pickup address"
                    value={formData.pickup_address}
                    onChange={e => setFormData(f => ({ ...f, pickup_address: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Drop-Off Address</Label>
                  <Input
                    placeholder="Enter drop-off address"
                    value={formData.dropoff_address}
                    onChange={e => setFormData(f => ({ ...f, dropoff_address: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>

                <Button className="w-full min-h-[44px]" onClick={handleCreateSession}>
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Student Picker Modal */}
      <StudentPickerModal
        open={studentPickerOpen}
        onOpenChange={setStudentPickerOpen}
        students={students}
        selectedId={formData.student_id}
        onSelect={handleStudentSelect}
      />

      {/* Filters Panel */}
      {showFilters && (
        <Card className="portal-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Instructor</Label>
                <Select value={filterInstructor} onValueChange={setFilterInstructor}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Instructors</SelectItem>
                    {instructors.map(i => <SelectItem key={i.id} value={i.id}>{getDisplayName(i, 'Unknown')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Student</Label>
                <Select value={filterStudent} onValueChange={setFilterStudent}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{getDisplayName(s, 'Unknown')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="driving">Driving</SelectItem>
                    <SelectItem value="testing">Road Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={() => { setFilterInstructor('all'); setFilterStudent('all'); setFilterType('all'); setFilterStatus('all'); }}>
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <SessionCalendar
        sessions={filteredSessions}
        userRole="admin"
        onSessionUpdate={fetchData}
        defaultView="month"
        onSlotClick={openCreateFromSlot}
      />
    </div>
  );
}
