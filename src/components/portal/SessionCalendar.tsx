import { useState } from "react";
import { Session } from "@/types/portal";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, User, AlertTriangle, ChevronLeft, ChevronRight, List, Grid, FileText } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, isBefore, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface SessionCalendarProps {
  sessions: Session[];
  userRole: 'student' | 'instructor' | 'staff' | 'admin';
  onSessionUpdate?: () => void;
}

export function SessionCalendar({ sessions, userRole, onSessionUpdate }: SessionCalendarProps) {
  const { user, role } = usePortalAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(s => isSameDay(parseISO(s.starts_at), day));
  };

  const handleCancelSession = async () => {
    if (!selectedSession || !cancellationReason.trim() || !user || !role) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by_role: role,
          cancellation_reason: cancellationReason.trim(),
        })
        .eq('id', selectedSession.id);

      if (error) throw error;

      // Create notification for the other party
      const notifyUserId = role === 'student' 
        ? selectedSession.instructor_id 
        : selectedSession.student_id;

      await supabase.from('notifications').insert({
        user_id: notifyUserId,
        title: 'Session Cancelled',
        message: `A session on ${format(parseISO(selectedSession.starts_at), 'MMM d, h:mm a')} has been cancelled.`,
        type: 'session_cancelled',
      });

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

  const getStatusBadge = (session: Session) => {
    switch (session.status) {
      case 'completed':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Scheduled</Badge>;
    }
  };

  const canCancel = (session: Session) => {
    if (session.status !== 'scheduled') return false;
    if (!isAfter(parseISO(session.starts_at), new Date())) return false;
    if (userRole === 'student' && session.student_id === user?.id) return true;
    if (userRole === 'instructor' && session.instructor_id === user?.id) return true;
    if (userRole === 'staff' || userRole === 'admin') return true;
    return false;
  };

  const canGrade = (session: Session) => {
    // Instructor can grade if session is scheduled and session time has passed
    if (session.status === 'completed' && session.report_card_id) return false; // Already has report card
    if (session.status === 'cancelled') return false;
    if (userRole === 'instructor' && session.instructor_id === user?.id) return true;
    if (userRole === 'admin') return true;
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
                          ? session.instructor?.full_name || 'Instructor'
                          : session.student?.full_name || 'Student'}
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
                            session.status === 'completed' && "bg-green-500/20 text-green-700 dark:text-green-300",
                            session.status === 'cancelled' && "bg-destructive/20 text-destructive",
                            session.status === 'scheduled' && "bg-primary/20 text-primary"
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
      <Dialog open={!!selectedSession && !cancelDialogOpen} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedSession)}
                {selectedSession.completed && (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Report Submitted
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-sm sm:text-base">{format(parseISO(selectedSession.starts_at), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Time</p>
                  <p className="font-medium text-sm sm:text-base">
                    {format(parseISO(selectedSession.starts_at), 'h:mm a')} - {format(parseISO(selectedSession.ends_at), 'h:mm a')}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {userRole === 'student' ? 'Instructor' : 'Student'}
                  </p>
                  <p className="font-medium text-sm sm:text-base">
                    {userRole === 'student' 
                      ? selectedSession.instructor?.full_name || 'Not assigned'
                      : selectedSession.student?.full_name || 'Not assigned'}
                  </p>
                </div>
              </div>

              {selectedSession.status === 'cancelled' && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Cancelled by {selectedSession.cancelled_by_role}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reason: {selectedSession.cancellation_reason}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">
              Keep Session
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSession}
              disabled={!cancellationReason.trim() || isLoading}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isLoading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}