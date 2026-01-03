import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit, X, Clock, User, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, addHours, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isAfter } from "date-fns";
import { Session, Profile } from "@/types/portal";
import { toast } from "sonner";

export default function AdminSchedule() {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
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

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    instructor_id: "",
    date: "",
    start_time: "",
    duration: "2",
  });

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

    // Fetch students
    const { data: studentRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    if (studentRoles) {
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentRoles.map(r => r.user_id))
        .eq('approved', true);
      setStudents(studentProfiles || []);
    }

    // Fetch instructors
    const { data: instructorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'instructor');

    if (instructorRoles) {
      const { data: instructorProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', instructorRoles.map(r => r.user_id));
      setInstructors(instructorProfiles || []);
    }

    setLoading(false);
  };

  const handleCreateSession = async () => {
    if (!formData.student_id || !formData.instructor_id || !formData.date || !formData.start_time) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startsAt = new Date(`${formData.date}T${formData.start_time}`);
    const endsAt = addHours(startsAt, parseInt(formData.duration));

    const { error } = await supabase.from('sessions').insert({
      student_id: formData.student_id,
      instructor_id: formData.instructor_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'scheduled',
    });

    if (error) {
      toast.error("Failed to create session");
      return;
    }

    toast.success("Session created successfully");
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    const startsAt = new Date(`${formData.date}T${formData.start_time}`);
    const endsAt = addHours(startsAt, parseInt(formData.duration));

    const { error } = await supabase
      .from('sessions')
      .update({
        student_id: formData.student_id,
        instructor_id: formData.instructor_id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .eq('id', editingSession.id);

    if (error) {
      toast.error("Failed to update session");
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
      toast.error("Failed to cancel session");
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
      duration: "2",
    });
  };

  const openEditDialog = (session: Session) => {
    setEditingSession(session);
    const startsAt = parseISO(session.starts_at);
    const endsAt = parseISO(session.ends_at);
    const durationHours = Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60));

    setFormData({
      student_id: session.student_id,
      instructor_id: session.instructor_id,
      date: format(startsAt, 'yyyy-MM-dd'),
      start_time: format(startsAt, 'HH:mm'),
      duration: durationHours.toString(),
    });
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
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
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
                    {instructors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>
                    ))}
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
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Duration (hours)</Label>
                <Select value={formData.duration} onValueChange={v => setFormData(f => ({ ...f, duration: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
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
                    className={`p-3 rounded-lg ${statusColors[session.status || 'scheduled']}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{format(parseISO(session.starts_at), 'h:mm a')}</p>
                        <p className="text-xs truncate">{getStudentName(session.student_id)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getInstructorName(session.instructor_id)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {session.status === 'scheduled' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(session)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAfter(parseISO(session.starts_at), new Date()) && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => openCancelDialog(session)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </>
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
                  onClick={() => session.status === 'scheduled' && openEditDialog(session)}
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
              <Label className="text-sm">Reason for cancellation</Label>
              <Textarea
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                placeholder="Optional reason..."
                className="text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setCancelDialogOpen(false)}>
                Keep Session
              </Button>
              <Button variant="destructive" className="flex-1 min-h-[44px]" onClick={handleCancelSession}>
                Cancel Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}