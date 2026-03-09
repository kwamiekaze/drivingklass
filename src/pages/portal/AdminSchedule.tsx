import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit, X, Clock, User, AlertTriangle, ChevronLeft, ChevronRight, FileText, CheckCircle, Eye, MessageSquare } from "lucide-react";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { format, parseISO, addHours, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isAfter } from "date-fns";
import { Session, Profile } from "@/types/portal";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { getDisplayName } from "@/lib/profileUtils";

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
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [noteForStudent, setNoteForStudent] = useState("");
  const [noteForInstructor, setNoteForInstructor] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    instructor_id: "",
    date: "",
    start_time: "",
    duration_minutes: "120",
    session_type: "driving",
  });
  const [startTimeAdjusted, setStartTimeAdjusted] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all sessions with student and instructor profiles
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)')
      .order('starts_at', { ascending: true });

    setSessions((sessionsData || []) as Session[]);

    // Fetch approved students using user_roles + profiles with approval_status
    const { data: studentRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    if (studentRoles && studentRoles.length > 0) {
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentRoles.map(r => r.user_id))
        .eq('approval_status', 'approved');
      setStudents((studentProfiles || []) as Profile[]);
    } else {
      setStudents([]);
    }

    // Fetch approved instructors using user_roles + profiles with approval_status
    const { data: instructorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'instructor');

    if (instructorRoles && instructorRoles.length > 0) {
      const { data: instructorProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', instructorRoles.map(r => r.user_id))
        .eq('approval_status', 'approved');
      setInstructors((instructorProfiles || []) as Profile[]);
    } else {
      setInstructors([]);
    }

    setLoading(false);
  };

  // Helper: snap time to next 30-minute boundary
  const snapTo30Min = (date: Date): Date => {
    const mins = date.getMinutes();
    if (mins === 0 || mins === 30) return date;
    const nextSlot = mins < 30 ? 30 : 60;
    const snapped = new Date(date);
    snapped.setMinutes(nextSlot === 60 ? 0 : nextSlot, 0, 0);
    if (nextSlot === 60) snapped.setHours(snapped.getHours() + 1);
    return snapped;
  };

  // Helper: ensure ends_at is on 30-min boundary (round up)
  const roundEndTo30Min = (date: Date): Date => {
    const mins = date.getMinutes();
    if (mins === 0 || mins === 30) return date;
    const rounded = new Date(date);
    const nextSlot = mins < 30 ? 30 : 60;
    rounded.setMinutes(nextSlot === 60 ? 0 : nextSlot, 0, 0);
    if (nextSlot === 60) rounded.setHours(rounded.getHours() + 1);
    return rounded;
  };

  const handleCreateSession = async () => {
    if (!formData.student_id || !formData.instructor_id || !formData.date || !formData.start_time) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Build timestamp from date + time
    const startsAt = new Date(`${formData.date}T${formData.start_time}`);
    const durationMinutes = parseInt(formData.duration_minutes);

    const debugPayload = {
      action: 'create_session_rpc',
      starts_at: startsAt.toISOString(),
      duration_minutes: durationMinutes,
      student_id: formData.student_id,
      instructor_id: formData.instructor_id,
    };
    console.log('Session creation payload:', debugPayload);

    // Use RPC for validated, atomic session creation
    const { data: newSession, error } = await supabase.rpc('create_session_admin', {
      _student_id: formData.student_id,
      _instructor_id: formData.instructor_id,
      _starts_at: startsAt.toISOString(),
      _duration_minutes: durationMinutes,
    });

    if (error) {
      console.error('Session creation error:', { ...debugPayload, error });
      toast.error(`Failed to create session: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
      return;
    }

    // Update session_type if not default
    if (formData.session_type !== 'driving' && newSession?.id) {
      await supabase.from('sessions').update({ session_type: formData.session_type }).eq('id', newSession.id);
    }

    toast.success("Session created successfully");
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    // Create starts_at from date + time and snap to 30-min boundary
    let startsAt = new Date(`${formData.date}T${formData.start_time}`);
    startsAt = snapTo30Min(startsAt);

    // Calculate ends_at and ensure it's on 30-min boundary
    const durationMs = parseInt(formData.duration_minutes) * 60 * 1000;
    let endsAt = new Date(startsAt.getTime() + durationMs);
    endsAt = roundEndTo30Min(endsAt);

    const { error } = await supabase
      .from('sessions')
      .update({
        student_id: formData.student_id,
        instructor_id: formData.instructor_id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        session_type: formData.session_type,
      })
      .eq('id', editingSession.id);

    if (error) {
      console.error('Session update error:', error);
      toast.error(`Failed to update session: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
      return;
    }

    toast.success("Session updated successfully");
    setDialogOpen(false);
    setEditingSession(null);
    resetForm();
    fetchData();
  };

  const handleCancelSession = async () => {
    if (!sessionToCancel || !cancellationReason.trim()) return;

    try {
      const { error } = await supabase.rpc('cancel_session', {
        _session_id: sessionToCancel.id,
        _reason: cancellationReason.trim()
      });

      if (error) throw error;

      toast.success("Session cancelled");
      setCancelDialogOpen(false);
      setSessionToCancel(null);
      setCancellationReason("");
      fetchData();
    } catch (error: any) {
      console.error('Session cancel error:', error);
      toast.error(`Failed to cancel session: ${error.message}`);
    }
  };

  const handleCompleteSession = async (session: Session) => {
    try {
      const { error } = await supabase.rpc('complete_session', {
        _session_id: session.id,
        _via: 'manual'
      });

      if (error) throw error;

      toast.success("Session marked as completed");
      setDetailSession(null);
      fetchData();
    } catch (error: any) {
      console.error('Session complete error:', error);
      toast.error(`Failed to complete session: ${error.message}`);
    }
  };

  const openNotesDialog = (session: Session) => {
    setNoteForStudent(session.note_for_student || "");
    setNoteForInstructor(session.note_for_instructor || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!detailSession) return;

    try {
      const { error } = await supabase.rpc('update_session_notes', {
        _session_id: detailSession.id,
        _note_for_student: noteForStudent || null,
        _note_for_instructor: noteForInstructor || null
      });

      if (error) throw error;

      toast.success("Notes saved successfully");
      setNotesDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Notes save error:', error);
      toast.error(`Failed to save notes: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      instructor_id: "",
      date: "",
      start_time: "",
      duration_minutes: "120",
      session_type: "driving",
    });
    setStartTimeAdjusted(false);
  };

  const openEditDialog = (session: Session) => {
    setEditingSession(session);
    const startsAt = parseISO(session.starts_at);
    const endsAt = parseISO(session.ends_at);
    const durationMins = Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60));

    setFormData({
      student_id: session.student_id,
      instructor_id: session.instructor_id,
      date: format(startsAt, 'yyyy-MM-dd'),
      start_time: format(startsAt, 'HH:mm'),
      duration_minutes: durationMins.toString(),
      session_type: (session as any).session_type || "driving",
    });
    setStartTimeAdjusted(false);
    setDialogOpen(true);
  };

  const openCancelDialog = (session: Session) => {
    setSessionToCancel(session);
    setCancelDialogOpen(true);
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(s => isSameDay(parseISO(s.starts_at), day));
  };

  const getStudentName = (session: Session) => getDisplayName(session.student, 'Unknown');
  const getInstructorName = (session: Session) => getDisplayName(session.instructor, 'Unknown');

  const getSessionColor = (session: any): string => {
    if (session.status === 'cancelled') return 'bg-red-500/20 text-red-700 dark:text-red-300';
    if (session.status === 'completed' || session.report_card_id) return 'bg-green-500/20 text-green-700 dark:text-green-300';
    if (session.session_type === 'testing') return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
    return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
  };

  // Keep legacy object for backward compat
  const statusColors: Record<string, string> = {
    scheduled: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
    completed: 'bg-green-500/20 text-green-700 dark:text-green-300',
    cancelled: 'bg-red-500/20 text-red-700 dark:text-red-300',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Schedule Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Create and manage driving sessions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSession(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto min-h-[44px]">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingSession ? 'Edit Session' : 'Create New Session'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Student</Label>
                <Select value={formData.student_id} onValueChange={v => setFormData(f => ({ ...f, student_id: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    {students.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No approved students</div>
                    ) : (
                      students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{getDisplayName(s, 'Unknown')}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Instructor</Label>
                <Select value={formData.instructor_id} onValueChange={v => setFormData(f => ({ ...f, instructor_id: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    {instructors.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No approved instructors</div>
                    ) : (
                      instructors.map(i => (
                        <SelectItem key={i.id} value={i.id}>{getDisplayName(i, 'Unknown')}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Start Time</Label>
                  <Select 
                    value={formData.start_time} 
                    onValueChange={v => setFormData(f => ({ ...f, start_time: v }))}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50 max-h-[300px]">
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2);
                        const mins = (i % 2) * 30;
                        const timeValue = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                        const ampm = hours < 12 ? 'AM' : 'PM';
                        const displayTime = `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
                        return (
                          <SelectItem key={timeValue} value={timeValue}>{displayTime}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Sessions start on :00 or :30 only</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Duration</Label>
                <Select value={formData.duration_minutes} onValueChange={v => setFormData(f => ({ ...f, duration_minutes: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="150">2.5 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Session Type</Label>
                <Select value={formData.session_type} onValueChange={v => setFormData(f => ({ ...f, session_type: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="driving">Driving Session</SelectItem>
                    <SelectItem value="testing">Road Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full min-h-[44px]"
                onClick={editingSession ? handleUpdateSession : handleCreateSession}
              >
                {editingSession ? 'Update Session' : 'Create Session'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Button variant="outline" size="sm" className="min-h-[40px] gap-1" onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() - 7)))}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden xs:inline">Previous</span>
        </Button>
        <span className="font-medium text-sm sm:text-base flex-1 text-center sm:flex-none">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="sm" className="min-h-[40px] gap-1" onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 7)))}>
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="min-h-[40px]" onClick={() => setSelectedDate(new Date())}>
          Today
        </Button>
      </div>

      {/* Mobile: Session List View */}
      <div className="md:hidden space-y-3">
        {weekDays.map(day => {
          const daySessions = getSessionsForDay(day);
          if (daySessions.length === 0) return null;
          
          return (
            <Card key={day.toISOString()} className={`portal-card ${isSameDay(day, new Date()) ? 'border-primary' : ''}`}>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span>{format(day, 'EEEE')}</span>
                  <Badge variant="secondary" className="text-xs">{format(day, 'MMM d')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {daySessions.map(session => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-80 ${statusColors[session.status || 'scheduled']}`}
                    onClick={() => setDetailSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{format(parseISO(session.starts_at), 'h:mm a')}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <SessionTypeBadge sessionType={(session as any).session_type} size="sm" />
                        </div>
                        <p className="text-xs truncate">{getStudentName(session)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getInstructorName(session)}</p>
                        {session.status === 'cancelled' && (
                          <Badge variant="destructive" className="text-[10px] mt-1">Cancelled</Badge>
                        )}
                        {session.status === 'completed' && (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] mt-1">Completed</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {session.status === 'scheduled' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditDialog(session); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); openCancelDialog(session); }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {session.status === 'completed' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); openCancelDialog(session); }}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {session.report_card_id && (
                          <Link to={`/instructor/report-cards/edit/${session.report_card_id}`} onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
        {weekDays.every(day => getSessionsForDay(day).length === 0) && (
          <Card className="portal-card">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No sessions this week
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: Week Calendar Grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {weekDays.map(day => (
          <Card key={day.toISOString()} className={`portal-card ${isSameDay(day, new Date()) ? 'border-primary' : ''}`}>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium">
                {format(day, 'EEE')}
                <span className="ml-2 text-muted-foreground">{format(day, 'd')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2 min-h-[120px]">
              {getSessionsForDay(day).map(session => (
                <div
                  key={session.id}
                  className={`p-2 rounded text-xs ${statusColors[session.status || 'scheduled']} cursor-pointer hover:opacity-80`}
                  onClick={() => setDetailSession(session)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{format(parseISO(session.starts_at), 'h:mm a')}</span>
                    {(session.status === 'scheduled' || session.status === 'completed') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancelDialog(session);
                        }}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="truncate">{getStudentName(session)}</p>
                  <p className="truncate text-muted-foreground">{getInstructorName(session)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={!!detailSession} onOpenChange={(open) => !open && setDetailSession(null)}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Session Details</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge className={statusColors[detailSession.status || 'scheduled']}>
                  {detailSession.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {detailSession.status === 'cancelled' && <X className="h-3 w-3 mr-1" />}
                  {detailSession.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                  {detailSession.status?.charAt(0).toUpperCase() + detailSession.status?.slice(1)}
                </Badge>
                <SessionTypeBadge sessionType={(detailSession as any).session_type} />
                {detailSession.completed && detailSession.report_card_id && (
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    Report Filed
                  </Badge>
                )}
              </div>

              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">{format(parseISO(detailSession.starts_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium text-sm">
                    {format(parseISO(detailSession.starts_at), 'h:mm a')} - {format(parseISO(detailSession.ends_at), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium text-sm">{getStudentName(detailSession)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Instructor</p>
                  <p className="font-medium text-sm">{getInstructorName(detailSession)}</p>
                </div>
              </div>

              {/* Session Notes */}
              {(detailSession.note_for_student || detailSession.note_for_instructor) && (
                <div className="space-y-2">
                  {detailSession.note_for_student && (
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Note for Student
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {detailSession.note_for_student}
                      </p>
                    </div>
                  )}
                  {detailSession.note_for_instructor && (
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Note for Instructor
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {detailSession.note_for_instructor}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cancelled Info */}
              {detailSession.status === 'cancelled' && (
                <div className="p-3 bg-gray-500/10 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Cancelled by {detailSession.cancelled_by_role}
                  </p>
                  {detailSession.cancellation_reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {detailSession.cancellation_reason}
                    </p>
                  )}
                  {detailSession.cancelled_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(detailSession.cancelled_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  {detailSession.report_card_id && (
                    <Link to={`/instructor/report-cards/edit/${detailSession.report_card_id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2 min-h-[44px]">
                        <Eye className="h-4 w-4" />
                        View Report Card
                      </Button>
                    </Link>
                  )}
                  {/* Edit Notes button - available for all sessions */}
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[44px] gap-2"
                    onClick={() => openNotesDialog(detailSession)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Edit Notes
                  </Button>
                </div>
                {detailSession.status === 'scheduled' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Grade Session link - only if no report card */}
                    {!detailSession.report_card_id && (
                      <Link to={`/instructor/report-cards/new?session_id=${detailSession.id}`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2 min-h-[44px]">
                          <FileText className="h-4 w-4" />
                          Grade Session
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 min-h-[44px] gap-2"
                      onClick={() => handleCompleteSession(detailSession)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Complete
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 min-h-[44px] gap-2"
                      onClick={() => {
                        setDetailSession(null);
                        openEditDialog(detailSession);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                )}
                {/* Cancel button - available for scheduled and completed sessions (admins can cancel past sessions) */}
                {(detailSession.status === 'scheduled' || detailSession.status === 'completed') && (
                  <Button
                    variant="destructive"
                    className="w-full min-h-[44px] gap-2"
                    onClick={() => {
                      setDetailSession(null);
                      openCancelDialog(detailSession);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel Session
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Are you sure you want to cancel this session?</p>
            {sessionToCancel && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Student:</strong> {getStudentName(sessionToCancel)}</p>
                <p><strong>Date:</strong> {format(parseISO(sessionToCancel.starts_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm">Reason for cancellation *</Label>
              <Textarea
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                className="text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setCancelDialogOpen(false)}>
                Keep Session
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 min-h-[44px]" 
                onClick={handleCancelSession}
                disabled={!cancellationReason.trim()}
              >
                Cancel Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Session Notes
            </DialogTitle>
            <DialogDescription className="text-sm">
              Add notes visible to the student or instructor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Note for Student</Label>
              <Textarea
                value={noteForStudent}
                onChange={e => setNoteForStudent(e.target.value)}
                placeholder="This note will be visible to the student..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Visible to: Student, Admin, Staff</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Note for Instructor</Label>
              <Textarea
                value={noteForInstructor}
                onChange={e => setNoteForInstructor(e.target.value)}
                placeholder="This note will be visible to the instructor..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Visible to: Instructor, Admin, Staff</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setNotesDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 min-h-[44px]" 
                onClick={handleSaveNotes}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}