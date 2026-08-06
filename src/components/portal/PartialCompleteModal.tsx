import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName?: string;
  scheduledMinutes: number;
  isLoading?: boolean;
  onConfirm: (reason: string, actualMinutes: number) => void | Promise<void>;
}

export function PartialCompleteModal({
  open,
  onOpenChange,
  studentName,
  scheduledMinutes,
  isLoading,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState<string>(String(scheduledMinutes || ""));
  const [touched, setTouched] = useState(false);

  const reasonValid = reason.trim().length > 0;
  const parsedMinutes = Number(minutes);
  const minutesValid =
    minutes === "" ||
    (Number.isFinite(parsedMinutes) && parsedMinutes >= 0 && parsedMinutes <= (scheduledMinutes || 1440));

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setMinutes(String(scheduledMinutes || ""));
      setTouched(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(92vw,460px)] max-w-[460px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Mark Partially Complete
          </DialogTitle>
          <DialogDescription className="text-xs">
            {studentName ? `${studentName}'s lesson ` : "This lesson "}
            will be recorded as partially complete. The student is emailed your reason and only the
            minutes completed are credited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">
              Why was this lesson only partially completed? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Student felt unwell and we ended the lesson early."
              rows={4}
              className="resize-none"
            />
            {touched && !reasonValid && (
              <p className="text-[11px] text-destructive">A reason is required.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Minutes actually completed (optional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={scheduledMinutes || undefined}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="min-h-[44px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Defaults to the scheduled duration ({scheduledMinutes} min). Cannot exceed it.
            </p>
            {!minutesValid && (
              <p className="text-[11px] text-destructive">
                Enter a number between 0 and {scheduledMinutes}.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            className="min-h-[44px] gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            disabled={!reasonValid || !minutesValid || isLoading}
            onClick={() => {
              setTouched(true);
              if (!reasonValid || !minutesValid) return;
              const finalMinutes = minutes === "" ? scheduledMinutes : parsedMinutes;
              onConfirm(reason.trim(), finalMinutes);
            }}
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Mark Partially Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
