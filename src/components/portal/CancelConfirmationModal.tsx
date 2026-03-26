import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CalendarClock, XCircle, ShieldCheck } from "lucide-react";
import { parseISO, differenceInHours, format } from "date-fns";

interface CancelConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionStartsAt: string;
  sessionEndsAt?: string;
  studentName?: string;
  instructorName?: string;
  userRole: 'student' | 'instructor' | 'staff' | 'admin';
  onConfirmCancel: (reason: string, waiveFee?: boolean, suppressStudentNotification?: boolean) => void;
  onRequestReschedule?: () => void;
  isLoading?: boolean;
}

export function CancelConfirmationModal({
  open,
  onOpenChange,
  sessionStartsAt,
  sessionEndsAt,
  studentName,
  instructorName,
  userRole,
  onConfirmCancel,
  onRequestReschedule,
  isLoading = false,
}: CancelConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [waiveFee, setWaiveFee] = useState(false);
  const [suppressNotify, setSuppressNotify] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSubmitted, setRescheduleSubmitted] = useState(false);

  const hoursUntilSession = differenceInHours(parseISO(sessionStartsAt), new Date());
  // Treat passed sessions (negative hours) as late too — they're past the start time
  const isLateOrPassed = hoursUntilSession < 24;
  const isStaff = userRole === 'admin' || userRole === 'staff' || userRole === 'instructor';

  const handleClose = (val: boolean) => {
    if (!val) {
      setReason("");
      setWaiveFee(false);
      setSuppressNotify(false);
      setShowRescheduleForm(false);
      setRescheduleReason("");
      setRescheduleSubmitted(false);
    }
    onOpenChange(val);
  };

  if (showRescheduleForm) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Request Reschedule
            </DialogTitle>
            <DialogDescription className="text-sm">
              Your request will be sent to the admin team.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Cancellation Policy
            </p>
            <p className="text-muted-foreground mt-1">
              Please note that cancellations made less than 24 hours before scheduled will incur a 30 minute reduction in your remaining hours.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Reason for reschedule (optional)</Label>
            <Textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="Why do you need to reschedule?"
              rows={3}
              className="text-sm"
            />
          </div>

          {rescheduleSubmitted ? (
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                ✅ Reschedule request submitted! An admin will reach out to you.
              </p>
            </div>
          ) : (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowRescheduleForm(false)} className="min-h-[44px]">
                Back
              </Button>
              <Button
                onClick={() => {
                  onRequestReschedule?.();
                  setRescheduleSubmitted(true);
                }}
                className="min-h-[44px]"
              >
                Submit Request
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[min(92vw,520px)] max-w-[520px] max-h-[80vh] overflow-y-auto mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            {userRole === 'student' ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Cancel or Reschedule?
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Cancel Session
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session details for staff */}
          {isStaff && (studentName || instructorName) && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              {studentName && (
                <p><span className="text-muted-foreground">Student:</span> <span className="font-medium">{studentName}</span></p>
              )}
              {instructorName && (
                <p><span className="text-muted-foreground">Instructor:</span> <span className="font-medium">{instructorName}</span></p>
              )}
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="font-medium">{format(parseISO(sessionStartsAt), 'EEEE, MMMM d, yyyy')}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Time:</span>{" "}
                <span className="font-medium">
                  {format(parseISO(sessionStartsAt), 'h:mm a')}
                  {sessionEndsAt && ` – ${format(parseISO(sessionEndsAt), 'h:mm a')}`}
                </span>
              </p>
            </div>
          )}

          {/* Policy notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Cancellation Policy
            </p>
            <p className="text-muted-foreground mt-1">
              Please note that cancellations made less than 24 hours before scheduled will incur a 30 minute reduction in your remaining hours.
            </p>
            {isLateOrPassed && (
              <p className="text-destructive font-medium mt-2">
                ⚠️ This cancellation is within 24 hours of the scheduled session and normally incurs a 30-minute reduction in remaining hours.
              </p>
            )}
          </div>

          {/* Waive fee checkbox — staff only, only when late/passed */}
          {isStaff && isLateOrPassed && (
            <div className="space-y-1">
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Checkbox
                  id="waive-fee"
                  checked={waiveFee}
                  onCheckedChange={(checked) => setWaiveFee(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <Label htmlFor="waive-fee" className="text-sm font-medium cursor-pointer">
                    Waive cancellation fee
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                If selected, no 30 minute late cancellation deduction will be applied.
              </p>
            </div>
          )}

          {/* Do not notify student checkbox — staff only */}
          {isStaff && (
            <div className="space-y-1">
              <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                <Checkbox
                  id="suppress-notify"
                  checked={suppressNotify}
                  onCheckedChange={(checked) => setSuppressNotify(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="suppress-notify" className="text-sm font-medium cursor-pointer">
                    Do not notify student
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                If selected, this cancellation will not send a notification to the student.
              </p>
            </div>
          )}

          {isStaff && !userRole.includes('student') && (
            <p className="text-sm text-muted-foreground">
              The student will see this cancellation as "Cancelled by DrivingKlass" — your identity will not be shown.
            </p>
          )}

          {userRole === 'student' && (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel, or would you prefer to reschedule?
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Cancellation Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need to cancel..."
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="destructive"
              onClick={() => onConfirmCancel(reason, waiveFee, suppressNotify)}
              disabled={!reason.trim() || isLoading}
              className="flex-1 min-h-[44px]"
            >
              {isLoading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1 min-h-[44px]"
            >
              Keep Session
            </Button>
          </div>
          {userRole === 'student' && (
            <Button
              variant="secondary"
              onClick={() => setShowRescheduleForm(true)}
              className="w-full min-h-[44px] gap-2"
            >
              <CalendarClock className="h-4 w-4" />
              Request Reschedule
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
