import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function ViewAsStudentBanner() {
  const { viewingAsStudent, stopViewingAs, isViewingAsStudent } = useViewAsStudent();

  if (!isViewingAsStudent || !viewingAsStudent) return null;

  return (
    <div className="sticky top-0 z-[60] bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate">
          Viewing as Student: {viewingAsStudent.name}
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={stopViewingAs}
        className="shrink-0 gap-1.5 h-8"
      >
        <X className="h-3.5 w-3.5" />
        Exit Student View
      </Button>
    </div>
  );
}
