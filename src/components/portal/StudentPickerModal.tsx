import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Profile } from "@/types/portal";
import { getDisplayName } from "@/lib/profileUtils";
import { Search, User, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type SortOption =
  | "recently_approved"
  | "oldest_approved"
  | "alpha_az"
  | "alpha_za"
  | "recently_signed_in"
  | "hours_high"
  | "hours_low";

interface StudentPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Profile[];
  selectedId: string;
  onSelect: (student: Profile) => void;
}

export function StudentPickerModal({ open, onOpenChange, students, selectedId, onSelect }: StudentPickerModalProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recently_approved");

  const filtered = useMemo(() => {
    let list = [...students];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((s) => {
        const name = getDisplayName(s, "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      switch (sort) {
        case "recently_approved": {
          const aDate = a.approved_at ? new Date(a.approved_at).getTime() : 0;
          const bDate = b.approved_at ? new Date(b.approved_at).getTime() : 0;
          return bDate - aDate;
        }
        case "oldest_approved": {
          const aDate = a.approved_at ? new Date(a.approved_at).getTime() : Infinity;
          const bDate = b.approved_at ? new Date(b.approved_at).getTime() : Infinity;
          return aDate - bDate;
        }
        case "alpha_az":
          return getDisplayName(a, "zzz").localeCompare(getDisplayName(b, "zzz"));
        case "alpha_za":
          return getDisplayName(b, "").localeCompare(getDisplayName(a, ""));
        case "recently_signed_in": {
          const aDate = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
          const bDate = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
          return bDate - aDate;
        }
        case "hours_high":
          return (b.hours_remaining ?? 0) - (a.hours_remaining ?? 0);
        case "hours_low":
          return (a.hours_remaining ?? 0) - (b.hours_remaining ?? 0);
        default:
          return 0;
      }
    });

    return list;
  }, [students, search, sort]);

  const handleSelect = (student: Profile) => {
    onSelect(student);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSearch(""); }}>
      <DialogContent className="w-[min(95vw,480px)] max-w-[480px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-border/50">
          <DialogTitle className="text-lg">Select Student</DialogTitle>
        </DialogHeader>

        {/* Search + Sort */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 min-h-[44px]"
              autoFocus
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-popover border z-[60]">
              <SelectItem value="recently_approved">Most Recently Approved</SelectItem>
              <SelectItem value="oldest_approved">Oldest Approved</SelectItem>
              <SelectItem value="alpha_az">Alphabetical A–Z</SelectItem>
              <SelectItem value="alpha_za">Alphabetical Z–A</SelectItem>
              <SelectItem value="recently_signed_in">Recently Signed In</SelectItem>
              <SelectItem value="hours_high">Highest Remaining Hours</SelectItem>
              <SelectItem value="hours_low">Lowest Remaining Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Student List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="px-2 py-1">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {search ? "No students match your search" : "No approved students"}
              </div>
            ) : (
              filtered.map((student) => {
                const isSelected = student.id === selectedId;
                const name = getDisplayName(student, "Unknown");
                const approvedDate = student.approved_at
                  ? format(parseISO(student.approved_at), "MMM d, yyyy")
                  : null;

                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelect(student)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors",
                      "hover:bg-accent/50 active:bg-accent",
                      isSelected && "bg-primary/10 border border-primary/30"
                    )}
                  >
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {student.email && <span className="truncate">{student.email}</span>}
                        {student.phone && <span className="shrink-0">• {student.phone}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {approvedDate && <span>Approved {approvedDate}</span>}
                        {student.hours_remaining != null && (
                          <span>• {student.hours_remaining}h remaining</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t border-border/50 text-xs text-muted-foreground">
          {filtered.length} student{filtered.length !== 1 ? "s" : ""}
        </div>
      </DialogContent>
    </Dialog>
  );
}
