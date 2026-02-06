import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoadTestResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  studentId: string;
  instructorId: string;
  onSubmitted: () => void;
}

export function RoadTestResultModal({
  open,
  onOpenChange,
  sessionId,
  studentId,
  instructorId,
  onSubmitted,
}: RoadTestResultModalProps) {
  const [result, setResult] = useState<"passed" | "failed" | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!result) {
      toast.error("Please select a result");
      return;
    }

    setSubmitting(true);
    try {
      const { error: resultError } = await supabase
        .from("road_test_results" as any)
        .insert({
          session_id: sessionId,
          student_id: studentId,
          instructor_id: instructorId,
          result,
          notes: notes || null,
        } as any);

      if (resultError) throw resultError;

      const { data, error: completeError } = await supabase.functions.invoke(
        "complete-session-deduct-hours",
        { body: { session_id: sessionId } }
      );

      if (completeError) throw completeError;
      if (!data?.success) throw new Error(data?.error || "Failed to complete session");

      const label = result === "passed" ? "Passed 🚀" : "Must Retry";
      toast.success(`Road test saved: ${label}`);

      setResult("");
      setNotes("");
      onOpenChange(false);
      onSubmitted();
    } catch (error: any) {
      console.error("Road test submission error:", error);
      toast.error(`Failed to submit result: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)] max-w-[480px] mx-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">Road Test Result</DialogTitle>
          <DialogDescription className="text-sm">
            Record the road test outcome. This will mark the session as completed and deduct hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Result *</Label>
            <Select value={result} onValueChange={(v) => setResult(v as "passed" | "failed")}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select result..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">Passed 🚀</SelectItem>
                <SelectItem value="failed">Must Retry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the road test..."
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!result || submitting}
            className="min-h-[44px] gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Result"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
