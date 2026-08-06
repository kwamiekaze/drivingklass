import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeInsights, type ReportCardRatings } from "@/lib/reportCardGraphData";
import { SKILL_KEYS } from "@/lib/reportCardGraphData";
import { Trophy, Target, TrendingUp } from "lucide-react";

interface Props {
  studentId?: string | null;
  className?: string;
}

/**
 * Compact Strongest / Focus / Most Improved chips for a student,
 * reusing the same computeInsights() used by the progress views.
 */
export function SessionSkillChips({ studentId, className }: Props) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<ReturnType<typeof computeInsights> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("report_cards")
        .select(`id, created_at, overall, ${SKILL_KEYS.join(", ")}`)
        .eq("student_id", studentId)
        .eq("report_card_status", "completed")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data || []) as unknown as ReportCardRatings[];
      setInsights(rows.length ? computeInsights(rows) : null);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <p className={`text-xs text-muted-foreground ${className || ""}`}>Loading skill summary…</p>;
  }

  if (!insights || insights.totalReports === 0) {
    return <p className={`text-xs text-muted-foreground ${className || ""}`}>No reports yet</p>;
  }

  const chips = [
    { label: "Strongest", value: insights.strongestSkill, icon: Trophy, cls: "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
    { label: "Focus", value: insights.focusArea, icon: Target, cls: "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10" },
    { label: "Most Improved", value: insights.mostImproved, icon: TrendingUp, cls: "text-sky-600 dark:text-sky-400 border-sky-500/40 bg-sky-500/10" },
  ];

  return (
    <div className={`flex flex-wrap gap-1.5 ${className || ""}`}>
      {chips.map((c) => (
        <div key={c.label} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${c.cls}`}>
          <c.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide opacity-80">{c.label}</span>
          <span className="text-[11px] font-medium">{c.value}</span>
        </div>
      ))}
    </div>
  );
}
