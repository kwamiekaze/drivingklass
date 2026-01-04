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
import { Calendar, Plus, Edit, X, Clock, User, AlertTriangle, ChevronLeft, ChevronRight, FileText, CheckCircle, Eye } from "lucide-react";
import { format, parseISO, addHours, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isAfter } from "date-fns";
import { Session, Profile } from "@/types/portal";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AdminSchedule() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
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

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    instructor_id: "",
    date: "",
    start_time: "",
    duration_minutes: "120", // Store as minutes internally
  });
  const [startTimeAdjusted, setStartTimeAdjusted] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all sessions
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
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

    // Create starts_at from date + time and snap to 30-min boundary
    let startsAt = new Date(`${formData.date}T${formData.start_time}`);
    startsAt = snapTo30Min(startsAt);

    // Calculate ends_at and ensure it's on 30-min boundary
    const durationMs = parseInt(formData.duration_minutes) * 60 * 1000;
    let endsAt = new Date(startsAt.getTime() + durationMs);
    endsAt = roundEndTo30Min(endsAt);

    const debugPayload = {
      action: 'create_session',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: parseInt(formData.duration_minutes),
      student_id: formData.student_id,
      instructor_id: formData.instructor_id,
    };
    console.log('Session creation payload:', debugPayload);

    const { error } = await supabase.from('sessions').insert({
      student_id: formData.student_id,
      instructor_id: formData.instructor_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: parseInt(formData.duration_minutes),
      status: 'scheduled',
    });

    if (error) {
      console.error('Session creation error:', { ...debugPayload, error });
      toast.error(`Failed to create session: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
      return;
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
    if (!sessionToCancel) return;

    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_role: 'admin',
        cancellation_reason: cancellationReason,
      })
      .eq('id', sessionToCancel.id);

    if (error) {
      console.error('Session cancel error:', error);
      toast.error(`Failed to cancel session: ${error.message}`);
      return;
    }

    toast.success("Session cancelled");
    setCancelDialogOpen(false);
    setSessionToCancel(null);
    setCancellationReason("");
    fetchData();
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      instructor_id: "",
      date: "",
      start_time: "",
      duration_minutes: "120",
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

  const getStudentName = (id: string) => students.find(s => s.id === id)?.full_name || 'Unknown';
  const getInstructorName = (id: string) => instructors.find(i => i.id === id)?.full_name || 'Unknown';

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
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
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
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
                        <SelectItem key={s.id} value={s.id}>{s.full_name || s.email || 'Unknown'}</SelectItem>
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
                        <SelectItem key={i.id} value={i.id}>{i.full_name || i.email || 'Unknown'}</SelectItem>
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
                        <p className="text-xs truncate">{getStudentName(session.student_id)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getInstructorName(session.instructor_id)}</p>
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
                            {isAfter(parseISO(session.starts_at), new Date()) && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); openCancelDialog(session); }}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </>
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
                    {session.status === 'scheduled' && isAfter(parseISO(session.starts_at), new Date()) && (
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
                  <p className="truncate">{getStudentName(session.student_id)}</p>
                  <p className="truncate text-muted-foreground">{getInstructorName(session.instructor_id)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={!!detailSession} onOpenChange={(open) => !open && setDetailSession(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
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
                  <p className="font-medium text-sm">{getStudentName(detailSession.student_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Instructor</p>
                  <p className="font-medium text-sm">{getInstructorName(detailSession.instructor_id)}</p>
                </div>
              </div>

              {/* Cancelled Info */}
              {detailSession.status === 'cancelled' && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
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
              <div className="flex flex-col sm:flex-row gap-2">
                {detailSession.report_card_id && (
                  <Link to={`/instructor/report-cards/edit/${detailSession.report_card_id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 min-h-[44px]">
                      <Eye className="h-4 w-4" />
                      View Report Card
                    </Button>
                  </Link>
                )}
                {detailSession.status === 'scheduled' && (
                  <>
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
                    {isAfter(parseISO(detailSession.starts_at), new Date()) && (
                      <Button
                        variant="destructive"
                        className="flex-1 min-h-[44px] gap-2"
                        onClick={() => {
                          setDetailSession(null);
                          openCancelDialog(detailSession);
                        }}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
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
                <p><strong>Student:</strong> {getStudentName(sessionToCancel.student_id)}</p>
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
    </div>
  );
}