import { useState, useEffect, useCallback } from "react";
import { Session, SessionDetails } from "@/types/portal";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, User, AlertTriangle, ChevronLeft, ChevronRight, List, Grid, FileText, MessageSquare, Loader2 } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, isBefore, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getDisplayName } from "@/lib/profileUtils";
import { SessionAddressSection } from "./SessionAddressSection";
import { AdminUserProfileModal, ClickableUserName, OpenProfileButton } from "./AdminUserProfileModal";

interface SessionCalendarProps {
  sessions: Session[];
  userRole: 'student' | 'instructor' | 'staff' | 'admin';
  onSessionUpdate?: () => void;
}

export function SessionCalendar({ sessions, userRole, onSessionUpdate }: SessionCalendarProps) {
  const { user, role, isStaffOrAdmin } = usePortalAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [noteForStudent, setNoteForStudent] = useState("");
  const [noteForInstructor, setNoteForInstructor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);

  // Fetch session details via RPC when a session is selected
  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setSessionDetails(null);
    
    try {
      const { data, error } = await supabase.rpc('get_session_details', {
        p_session_id: sessionId
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSessionDetails(data[0] as SessionDetails);
      } else {
        setDetailsError('Unable to load session details');
      }
    } catch (err: any) {
      console.error('Error fetching session details:', err);
      setDetailsError(err.message || 'Failed to load session details');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // When selectedSession changes, fetch details
  useEffect(() => {
    if (selectedSession?.id) {
      fetchSessionDetails(selectedSession.id);
    } else {
      setSessionDetails(null);
      setDetailsError(null);
    }
  }, [selectedSession?.id, fetchSessionDetails]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(s => isSameDay(parseISO(s.starts_at), day));
  };

  const handleCancelSession = async () => {
    if (!selectedSession || !cancellationReason.trim() || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('cancel_session', {
        _session_id: selectedSession.id,
        _reason: cancellationReason.trim()
      });

      if (error) throw error;

      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled successfully.",
      });

      setCancelDialogOpen(false);
      setCancellationReason("");
      setSelectedSession(null);
      onSessionUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!selectedSession || !user) return;

    setIsLoading(true);
    try {
      // Use edge function to complete session and deduct hours
      const { data, error } = await supabase.functions.invoke('complete-session-deduct-hours', {
        body: { session_id: selectedSession.id }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Session Completed",
          description: data.message || "The session has been marked as completed.",
        });
      } else {
        throw new Error(data?.error || "Failed to complete session");
      }

      setCompleteDialogOpen(false);
      setSelectedSession(null);
      onSessionUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSession || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('update_session_notes', {
        _session_id: selectedSession.id,
        _note_for_student: noteForStudent || null,
        _note_for_instructor: noteForInstructor || null
      });

      if (error) throw error;

      toast({
        title: "Notes Saved",
        description: "Session notes have been updated.",
      });

      setNotesDialogOpen(false);
      onSessionUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openNotesDialog = (session: Session) => {
    setNoteForStudent(session.note_for_student || "");
    setNoteForInstructor(session.note_for_instructor || "");
    setNotesDialogOpen(true);
  };

  const getStatusBadge = (session: Session) => {
    switch (session.status) {
      case 'completed':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-gray-500 text-white gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Scheduled</Badge>;
    }
  };

  const getCalendarColor = (session: Session) => {
    if (session.status === 'cancelled') return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
    if (session.status === 'completed' || session.report_card_id) return "bg-green-500/20 text-green-700 dark:text-green-300";
    return "bg-primary/20 text-primary";
  };

  const canCancel = (session: Session) => {
    if (session.status !== 'scheduled') return false;
    if (userRole === 'student' && session.student_id === user?.id) return true;
    if (userRole === 'instructor' && session.instructor_id === user?.id) return true;
    if (isStaffOrAdmin) return true;
    return false;
  };

  const canComplete = (session: Session) => {
    if (session.status !== 'scheduled') return false;
    // Students cannot complete sessions
    if (userRole === 'student') return false;
    if (userRole === 'instructor' && session.instructor_id === user?.id) return true;
    if (isStaffOrAdmin) return true;
    return false;
  };

  const canGrade = (session: Session) => {
    // Cannot grade if already has report card
    if (session.report_card_id) return false;
    if (session.status === 'cancelled') return false;
    if (userRole === 'instructor' && session.instructor_id === user?.id) return true;
    if (isStaffOrAdmin) return true;
    return false;
  };

  // Check if user can see specific notes
  const canSeeNoteForStudent = (session: Session) => {
    if (isStaffOrAdmin) return true;
    if (userRole === 'student' && session.student_id === user?.id) return true;
    return false;
  };

  const canSeeNoteForInstructor = (session: Session) => {
    if (isStaffOrAdmin) return true;
    if (userRole === 'instructor' && session.instructor_id === user?.id) return true;
    return false;
  };

  const upcomingSessions = sessions
    .filter(s => s.status === 'scheduled' && isAfter(parseISO(s.starts_at), new Date()))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const allSessionsSorted = [...sessions].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div className="space-y-4">
      {/* View Toggle + Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'agenda' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('agenda')}
            className="gap-1.5 min-h-[40px]"
          >
            <List className="h-4 w-4" />
            <span className="hidden xs:inline">Agenda</span>
          </Button>
          <Button 
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-1.5 min-h-[40px] hidden md:flex"
          >
            <Grid className="h-4 w-4" />
            <span>Calendar</span>
          </Button>
        </div>
        
        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm sm:text-base font-medium min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Agenda View (Mobile-first) */}
      {viewMode === 'agenda' && (
        <Card className="portal-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Sessions ({upcomingSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {upcomingSessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  No upcoming sessions scheduled
                </p>
              ) : (
                upcomingSessions.slice(0, 10).map(session => (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {format(parseISO(session.starts_at), 'MMM')}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-primary">
                          {format(parseISO(session.starts_at), 'd')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base">
                          {format(parseISO(session.starts_at), 'EEEE')}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(parseISO(session.starts_at), 'h:mm a')} - {format(parseISO(session.ends_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13 sm:ml-0">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm truncate">
                        {userRole === 'student' 
                          ? getDisplayName(session.instructor, 'Instructor')
                          : getDisplayName(session.student, 'Student')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid View (Desktop) */}
      {viewMode === 'calendar' && (
        <Card className="portal-card hidden md:block">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1 h-16 sm:h-20" />
              ))}
              
              {daysInMonth.map(day => {
                const daySessions = getSessionsForDay(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1 sm:p-2 h-16 sm:h-20 border rounded-lg overflow-hidden",
                      isToday && "border-primary bg-primary/5",
                      isBefore(day, new Date()) && !isToday && "opacity-50"
                    )}
                  >
                    <div className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {daySessions.slice(0, 2).map(session => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={cn(
                            "w-full text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate text-left",
                            getCalendarColor(session)
                          )}
                        >
                          {format(parseISO(session.starts_at), 'h:mma')}
                        </button>
                      ))}
                      {daySessions.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{daySessions.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Sessions List */}
      <Card className="portal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allSessionsSorted.slice(0, 10).map(session => (
              <div
                key={session.id}
                className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{format(parseISO(session.starts_at), 'MMM d')}</span>
                  <span className="text-muted-foreground">{format(parseISO(session.starts_at), 'h:mm a')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(session)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession && !cancelDialogOpen && !completeDialogOpen && !notesDialogOpen} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              {/* Loading state for details */}
              {detailsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              
              {/* Error state */}
              {detailsError && !detailsLoading && (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">{detailsError}</p>
                  <Button size="sm" variant="outline" onClick={() => fetchSessionDetails(selectedSession.id)}>
                    Retry
                  </Button>
                </div>
              )}
              
              {/* Session details content - only show when loaded */}
              {sessionDetails && !detailsLoading && !detailsError && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(selectedSession)}
                    {sessionDetails.report_card_id && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        Report Submitted
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-sm sm:text-base">{format(parseISO(sessionDetails.starts_at), 'EEEE, MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                      <p className="font-medium text-sm sm:text-base">
                        {format(parseISO(sessionDetails.starts_at), 'h:mm a')} - {format(parseISO(sessionDetails.ends_at), 'h:mm a')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Student</p>
                      <div className="flex items-center gap-1">
                        {isStaffOrAdmin && sessionDetails.student_id ? (
                          <>
                            <ClickableUserName
                              userId={sessionDetails.student_id}
                              name={sessionDetails.student_name || 'Not assigned'}
                              className="font-medium text-sm sm:text-base"
                              onOpenProfile={(id) => { setProfileModalUserId(id); setProfileModalOpen(true); }}
                            />
                            <OpenProfileButton
                              userId={sessionDetails.student_id}
                              onOpenProfile={(id) => { setProfileModalUserId(id); setProfileModalOpen(true); }}
                              className="h-6 w-6"
                            />
                          </>
                        ) : (
                          <p className="font-medium text-sm sm:text-base">{sessionDetails.student_name || 'Not assigned'}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Instructor</p>
                      <div className="flex items-center gap-1">
                        {isStaffOrAdmin && sessionDetails.instructor_id ? (
                          <>
                            <ClickableUserName
                              userId={sessionDetails.instructor_id}
                              name={sessionDetails.instructor_name || 'Not assigned'}
                              className="font-medium text-sm sm:text-base"
                              onOpenProfile={(id) => { setProfileModalUserId(id); setProfileModalOpen(true); }}
                            />
                            <OpenProfileButton
                              userId={sessionDetails.instructor_id}
                              onOpenProfile={(id) => { setProfileModalUserId(id); setProfileModalOpen(true); }}
                              className="h-6 w-6"
                            />
                          </>
                        ) : (
                          <p className="font-medium text-sm sm:text-base">{sessionDetails.instructor_name || 'Not assigned'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Addresses section - visible to all roles */}
                  <SessionAddressSection 
                    pickupAddress={sessionDetails.pickup_address}
                    dropoffAddress={sessionDetails.dropoff_address}
                  />
                  {canSeeNoteForStudent(selectedSession) && sessionDetails.note_for_student && (
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Note from Staff
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sessionDetails.note_for_student}
                      </p>
                    </div>
                  )}

                  {canSeeNoteForInstructor(selectedSession) && sessionDetails.note_for_instructor && (
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Staff Note (Instructor)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sessionDetails.note_for_instructor}
                      </p>
                    </div>
                  )}

                  {sessionDetails.status === 'cancelled' && sessionDetails.cancellation_reason && (
                    <div className="p-3 bg-gray-500/10 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Cancelled
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {sessionDetails.cancellation_reason}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    {canGrade(selectedSession) && (
                      <Link to={`/instructor/report-cards/new?session_id=${selectedSession.id}`} className="flex-1">
                        <Button className="w-full min-h-[44px] gap-2">
                          <FileText className="h-4 w-4" />
                          Grade Session
                        </Button>
                      </Link>
                    )}

                    {canComplete(selectedSession) && (
                      <Button
                        variant="outline"
                        onClick={() => setCompleteDialogOpen(true)}
                        className="flex-1 min-h-[44px] gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark Completed
                      </Button>
                    )}

                    {isStaffOrAdmin && (
                      <Button
                        variant="outline"
                        onClick={() => openNotesDialog(selectedSession)}
                        className="flex-1 min-h-[44px] gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Edit Notes
                      </Button>
                    )}

                    {canCancel(selectedSession) && (
                      <Button
                        variant="destructive"
                        onClick={() => setCancelDialogOpen(true)}
                        className="flex-1 min-h-[44px]"
                      >
                        Cancel Session
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Cancel Session</DialogTitle>
            <DialogDescription className="text-sm">
              Please provide a reason for cancelling this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Cancellation Reason *</Label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please explain why you need to cancel..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="min-h-[44px]">
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSession}
              disabled={!cancellationReason.trim() || isLoading}
              className="min-h-[44px]"
            >
              {isLoading ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Mark Session Complete</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to mark this session as completed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} className="min-h-[44px]">
              Go Back
            </Button>
            <Button
              onClick={handleCompleteSession}
              disabled={isLoading}
              className="min-h-[44px] gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {isLoading ? "Completing..." : "Confirm Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog (Staff/Admin only) */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Session Notes</DialogTitle>
            <DialogDescription className="text-sm">
              Add notes visible to the student or instructor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Note for Student</Label>
              <Textarea
                value={noteForStudent}
                onChange={(e) => setNoteForStudent(e.target.value)}
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
                onChange={(e) => setNoteForInstructor(e.target.value)}
                placeholder="This note will be visible to the instructor..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Visible to: Instructor, Admin, Staff</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              {isLoading ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin User Profile Modal */}
      <AdminUserProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        userId={profileModalUserId}
        onProfileUpdated={onSessionUpdate}
      />
    </div>
  );
}