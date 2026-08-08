import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";

interface ViewRow {
  viewer_type: string;
  viewer_name: string;
  via: string;
  viewed_at: string;
}

const STAFF_TYPES = ["instructor", "admin", "staff"];

/**
 * Instructor/admin-only panel showing real view history for a report card.
 * Never rendered for students.
 */
export function ReportCardViewLog({ reportCardId }: { reportCardId: string }) {
  const [rows, setRows] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_report_card_view_log", {
        p_report_card_id: reportCardId,
      });
      if (cancelled) return;
      if (!error && data) setRows(data as ViewRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reportCardId]);

  if (loading) return null;

  const realViews = rows.filter((r) => !STAFF_TYPES.includes(r.viewer_type));
  const count = realViews.length;
  const fmt = (d: string) => format(parseISO(d), "MMM d, yyyy h:mm a");
  // rows come back newest-first
  const last = realViews[0];
  const first = realViews[realViews.length - 1];

  return (
    <div
      className={`p-3 rounded-lg border text-sm space-y-2 ${
        count > 0
          ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
          : "bg-muted/40 border-border text-muted-foreground"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <span className="font-medium flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          {count > 0 ? `Viewed ${count} time${count === 1 ? "" : "s"}` : "Not viewed yet"}
        </span>
        {count > 0 && (
          <span className="text-xs">
            First {fmt(first.viewed_at)}
            {count > 1 && ` · Last ${fmt(last.viewed_at)}`}
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs underline underline-offset-2 flex items-center gap-1"
          >
            {expanded ? "Hide" : "Show"} recent views
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expanded && (
            <ul className="space-y-1 pt-1">
              {rows.map((r, i) => (
                <li key={i} className="flex justify-between gap-2 text-xs">
                  <span className="truncate">
                    {r.viewer_name}
                    {STAFF_TYPES.includes(r.viewer_type) && (
                      <span className="opacity-70"> · {r.viewer_type} preview</span>
                    )}
                  </span>
                  <span className="shrink-0 opacity-80">{fmt(r.viewed_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
