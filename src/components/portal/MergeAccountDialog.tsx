import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, GitMerge, AlertTriangle } from "lucide-react";
import { getDisplayName } from "@/lib/profileUtils";

interface Candidate {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  approval_status: string;
}

interface MergeAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUserId: string;
  sourceLabel: string;
  onMerged?: () => void;
}

export function MergeAccountDialog({
  open,
  onOpenChange,
  sourceUserId,
  sourceLabel,
  onMerged,
}: MergeAccountDialogProps) {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Candidate | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setTarget(null);
      setSearch("");
      return;
    }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, email, approval_status")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      setCandidates((data || []).filter((c) => c.id !== sourceUserId) as Candidate[]);
      setLoading(false);
    };
    load();
  }, [open, sourceUserId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return candidates.slice(0, 25);
    return candidates
      .filter((c) =>
        `${c.first_name || ""} ${c.last_name || ""} ${c.full_name || ""} ${c.email || ""}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 25);
  }, [candidates, search]);

  const handleMerge = async () => {
    if (!target) return;
    setMerging(true);
    const { error } = await supabase.rpc("merge_student_account", {
      p_source_user_id: sourceUserId,
      p_target_user_id: target.id,
    });
    setMerging(false);
    if (error) {
      toast({ title: "Merge failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Accounts merged",
      description: `All records moved to ${getDisplayName(target as any, target.email || "the approved account")}. The original email still signs in to that account.`,
    });
    onOpenChange(false);
    onMerged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,520px)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitMerge className="h-5 w-5 text-primary" />
            Merge into existing account
          </DialogTitle>
          <DialogDescription>
            Move everything from <span className="font-medium">{sourceLabel}</span> into an approved
            student account.
          </DialogDescription>
        </DialogHeader>

        {!target ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search approved students by name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No approved accounts found</p>
            ) : (
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setTarget(c)}
                    className="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40"
                  >
                    <p className="text-sm font-medium">{getDisplayName(c as any, "Unknown")}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Confirm merge
              </div>
              <p className="text-muted-foreground">
                Everything belonging to <span className="font-medium text-foreground">{sourceLabel}</span>{" "}
                — lessons, report cards, road tests, intake details, permits and documents,
                notifications, proposals, tracking, feedback and hours — moves to{" "}
                <span className="font-medium text-foreground">
                  {getDisplayName(target as any, target.email || "the target account")}
                </span>
                . Hours are recalculated on the target. Nothing is deleted, and the original email
                keeps signing in — it becomes a secondary email on the merged account.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setTarget(null)} disabled={merging}>
                Back
              </Button>
              <Button className="flex-1 gap-2" onClick={handleMerge} disabled={merging}>
                {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
                Merge accounts
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
