import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import {
  computeRadarData,
  computeTrendData,
  computeInsights,
  type ReportCardRatings,
} from "@/lib/reportCardGraphData";
import { StudentProgressRadarChart } from "./StudentProgressRadarChart";
import { StudentProgressTrendChart } from "./StudentProgressTrendChart";
import { StudentProgressSummaryCards } from "./StudentProgressSummaryCards";
import { SKILL_KEYS } from "@/lib/reportCardGraphData";

interface Props {
  studentId: string;
  /** If true, a minimal version (e.g. for public view) */
  compact?: boolean;
  className?: string;
}

export function StudentProgressSection({ studentId, compact, className }: Props) {
  const [reports, setReports] = useState<ReportCardRatings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetchReports();
  }, [studentId]);

  const fetchReports = async () => {
    setLoading(true);
    // Explicitly select every skill field to guarantee 1:1 match with SKILL_KEYS
    const selectFields = [
      'id', 'created_at', 'overall',
      'acceleration', 'braking', 'left_turns', 'right_turns',
      'speed_maintenance', 'lane_maintenance', 'blind_spots', 'signal_usage',
      'changing_lanes', 'following_distance', 'road_sign_awareness', 'distractions',
      'general_parking', 'reverse_parking', 'parallel_parking',
      'straight_line_backing', 'turn_about', 'merging', 'interstate',
    ].join(', ');

    const { data } = await supabase
      .from('report_cards')
      .select(`${selectFields}, session:sessions!report_cards_session_id_fkey(session_type)`)
      .eq('student_id', studentId)
      .eq('report_card_status', 'completed')
      .order('created_at', { ascending: true });

    if (data) {
      // Filter to driving sessions only
      const drivingReports = data.filter(
        (r: any) => !r.session || r.session.session_type === 'driving'
      ) as unknown as ReportCardRatings[];
      setReports(drivingReports);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="border-border/50 bg-card/60 backdrop-blur">
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            No driving report card data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const radarData = computeRadarData(reports);
  const trendData = computeTrendData(reports);
  const insights = computeInsights(reports);

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold text-foreground">
          Skill Progress
        </h3>
      </div>

      {/* Summary Cards */}
      {!compact && <StudentProgressSummaryCards insights={insights} />}

      {/* Radar Chart */}
      <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden">
        <CardContent className="p-2 sm:p-4">
          <StudentProgressRadarChart data={radarData} />
          {reports.length === 1 && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              More sessions will make your progress graph even more detailed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {!compact && trendData.length >= 2 && (
        <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <StudentProgressTrendChart data={trendData} />
          </CardContent>
        </Card>
      )}

      {compact && (
        <StudentProgressSummaryCards insights={insights} />
      )}
    </div>
  );
}
