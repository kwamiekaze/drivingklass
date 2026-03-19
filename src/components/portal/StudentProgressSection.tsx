import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import {
  computeRadarData,
  computeTrendData,
  computeInsights,
  type ReportCardRatings,
  type ReportCardSkillSnapshot,
} from "@/lib/reportCardGraphData";
import { StudentProgressRadarChart } from "./StudentProgressRadarChart";
import { StudentProgressTrendChart } from "./StudentProgressTrendChart";
import { StudentProgressSummaryCards } from "./StudentProgressSummaryCards";

interface SkillHighlightItem {
  skill_key: string;
  skill_label: string;
  source_type?: string;
}

export interface SavedHighlights {
  strongest_skills?: SkillHighlightItem[];
  most_improved_skills?: SkillHighlightItem[];
  focus_areas?: SkillHighlightItem[];
}

interface Props {
  studentId: string;
  reportCardId?: string;
  anchorReport?: ReportCardSkillSnapshot;
  /** Saved highlight data from the report card — used as source of truth for summary cards */
  savedHighlights?: SavedHighlights;
  /** If true, a minimal version (e.g. for public view) */
  compact?: boolean;
  className?: string;
}

const sortReportsByCreatedAt = (reports: ReportCardRatings[]) =>
  [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

export function StudentProgressSection({
  studentId,
  reportCardId,
  anchorReport,
  compact,
  className,
}: Props) {
  const [historyReports, setHistoryReports] = useState<ReportCardRatings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetchReports();
  }, [studentId]);

  const fetchReports = async () => {
    setLoading(true);
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
      const drivingReports = data.filter(
        (r: any) => !r.session || r.session.session_type === 'driving'
      ) as unknown as ReportCardRatings[];
      setHistoryReports(drivingReports);
    }

    setLoading(false);
  };

  const reports = useMemo(() => {
    const mergedReports = [...historyReports];

    if (anchorReport?.id) {
      const targetId = reportCardId || anchorReport.id;
      const existingIndex = mergedReports.findIndex((report) => report.id === targetId);
      const mergedAnchor = existingIndex >= 0
        ? { ...mergedReports[existingIndex], ...anchorReport }
        : { ...anchorReport };

      if (existingIndex >= 0) {
        mergedReports[existingIndex] = mergedAnchor;
      } else {
        mergedReports.push(mergedAnchor);
      }
    }

    const orderedReports = sortReportsByCreatedAt(mergedReports);

    if (!reportCardId) return orderedReports;

    const anchorIndex = orderedReports.findIndex((report) => report.id === reportCardId);
    return anchorIndex >= 0 ? orderedReports.slice(0, anchorIndex + 1) : orderedReports;
  }, [historyReports, reportCardId, anchorReport]);

  const radarData = useMemo(() => computeRadarData(reports), [reports]);
  const trendData = useMemo(() => computeTrendData(reports), [reports]);
  const insights = useMemo(() => computeInsights(reports), [reports]);

  if (typeof window !== 'undefined' && (window as any).__DEBUG_RADAR) {
    console.log('[RadarData][resolved-reports]', {
      studentId,
      reportCardId,
      reportIds: reports.map((report) => report.id),
      latestReportId: reports[reports.length - 1]?.id,
      latestRatings: radarData.map((point) => ({ skill: point.skill, latest: point.latest })),
    });
  }

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

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold text-foreground">
          Skill Progress
        </h3>
      </div>

      {!compact && <StudentProgressSummaryCards insights={insights} />}

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

      {!compact && trendData.length >= 2 && (
        <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <StudentProgressTrendChart data={trendData} />
          </CardContent>
        </Card>
      )}

      {compact && <StudentProgressSummaryCards insights={insights} />}
    </div>
  );
}
