import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function RejectUserModal({
  open,
  onOpenChange,
  userName,
  onConfirm,
  isLoading,
}: RejectUserModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg sm:text-xl">
            Reject this user?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            Are you sure you want to reject <strong>{userName}</strong>? 
            This will deny access and notify the user.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="rejection-reason" className="text-sm font-medium">
            Rejection Reason (optional)
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Enter a reason for rejection (will be shared with the user)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            className="w-full sm:w-auto min-h-[44px]"
            autoFocus
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Rejecting..." : "Yes, Reject User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
