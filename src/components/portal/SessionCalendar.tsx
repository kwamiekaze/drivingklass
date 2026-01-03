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
import { Calendar, Clock, CheckCircle, XCircle, User, AlertTriangle } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, isBefore, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

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
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
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

  return (
    <div className="space-y-4">
      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          Previous
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          Next
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 h-20" />
            ))}
            
            {daysInMonth.map(day => {
              const daySessions = getSessionsForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-2 h-20 border rounded-lg overflow-hidden",
                    isToday && "border-primary bg-primary/5",
                    isBefore(day, new Date()) && !isToday && "opacity-50"
                  )}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {daySessions.slice(0, 2).map(session => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={cn(
                          "w-full text-xs p-1 rounded truncate text-left",
                          session.status === 'completed' && "bg-green-500/20 text-green-700 dark:text-green-300",
                          session.status === 'cancelled' && "bg-destructive/20 text-destructive",
                          session.status === 'scheduled' && "bg-primary/20 text-primary"
                        )}
                      >
                        {format(parseISO(session.starts_at), 'h:mm a')}
                        {session.completed && <CheckCircle className="h-3 w-3 inline ml-1" />}
                      </button>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{daySessions.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions
              .filter(s => s.status === 'scheduled' && isAfter(parseISO(s.starts_at), new Date()))
              .slice(0, 5)
              .map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {format(parseISO(session.starts_at), 'EEEE, MMM d')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(session.starts_at), 'h:mm a')} - {format(parseISO(session.ends_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {userRole === 'student' 
                        ? session.instructor?.full_name || 'Instructor'
                        : session.student?.full_name || 'Student'}
                    </span>
                  </div>
                </div>
              ))}
            {sessions.filter(s => s.status === 'scheduled' && isAfter(parseISO(s.starts_at), new Date())).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No upcoming sessions scheduled
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession && !cancelDialogOpen} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedSession)}
                {selectedSession.completed && (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Report Card Submitted
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(parseISO(selectedSession.starts_at), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(parseISO(selectedSession.starts_at), 'h:mm a')} - {format(parseISO(selectedSession.ends_at), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {userRole === 'student' ? 'Instructor' : 'Student'}
                  </p>
                  <p className="font-medium">
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

              {canCancel(selectedSession) && (
                <Button
                  variant="destructive"
                  onClick={() => setCancelDialogOpen(true)}
                  className="w-full"
                >
                  Cancel Session
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this session. This will be visible to all parties.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Reason *</Label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please explain why you need to cancel..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Session
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSession}
              disabled={!cancellationReason.trim() || isLoading}
            >
              {isLoading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
