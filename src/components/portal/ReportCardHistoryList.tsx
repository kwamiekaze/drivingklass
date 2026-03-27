import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Star, ChevronRight, ClipboardCheck, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ReportCardHistoryListProps {
  studentId: string;
  currentReportCardId?: string;
  currentSessionId?: string;
}

interface HistoryItem {
  session_id: string;
  session_type: string;
  session_starts_at: string;
  sessionNumber: number;
  instructor_name: string;
  // Driving report data
  report_card_id: string | null;
  overall: number | null;
  // Road test data
  road_test_result_id: string | null;
  road_test_outcome: string | null;
}

export function ReportCardHistoryList({ studentId, currentReportCardId, currentSessionId }: ReportCardHistoryListProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Source of truth: sessions table — all non-cancelled sessions for student
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('id, starts_at, session_type, status, instructor_id')
          .eq('student_id', studentId)
          .neq('status', 'cancelled')
          .order('starts_at', { ascending: true });

        if (cancelled || !allSessions || allSessions.length === 0) {
          setItems([]);
          return;
        }

        // Fetch report cards and road test results in parallel
        const sessionIds = allSessions.map(s => s.id);
        const [reportsRes, roadTestsRes] = await Promise.all([
          supabase
            .from('report_cards')
            .select('id, session_id, overall')
            .eq('student_id', studentId)
            .eq('report_card_status', 'completed')
            .in('session_id', sessionIds),
          supabase
            .from('road_test_results')
            .select('id, session_id, result')
            .eq('student_id', studentId)
            .in('session_id', sessionIds),
        ]);

        const reportMap: Record<string, { id: string; overall: number | null }> = {};
        (reportsRes.data || []).forEach(r => { reportMap[r.session_id] = { id: r.id, overall: r.overall }; });

        const roadTestMap: Record<string, { id: string; result: string }> = {};
        (roadTestsRes.data || []).forEach(rt => { roadTestMap[rt.session_id] = { id: rt.id, result: rt.result }; });

        // Only include sessions that have a completed report card or road test result
        const completedSessions = allSessions.filter(s =>
          reportMap[s.id] || roadTestMap[s.id]
        );

        if (completedSessions.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        // Fetch instructor names
        const instrIds = [...new Set(completedSessions.map(s => s.instructor_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email')
          .in('id', instrIds);

        const instrMap: Record<string, string> = {};
        (profiles || []).forEach(p => {
          instrMap[p.id] = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Instructor';
        });

        // Build session number map from ALL non-cancelled sessions
        const sessionNumMap: Record<string, number> = {};
        allSessions.forEach((s, i) => { sessionNumMap[s.id] = i + 1; });

        // Build history items
        const historyItems: HistoryItem[] = completedSessions.map(s => {
          const report = reportMap[s.id];
          const roadTest = roadTestMap[s.id];
          const isRoadTest = s.session_type === 'testing';

          return {
            session_id: s.id,
            session_type: s.session_type,
            session_starts_at: s.starts_at,
            sessionNumber: sessionNumMap[s.id] || 0,
            instructor_name: instrMap[s.instructor_id] || 'Instructor',
            report_card_id: !isRoadTest && report ? report.id : null,
            overall: !isRoadTest && report ? report.overall : null,
            road_test_result_id: isRoadTest && roadTest ? roadTest.id : null,
            road_test_outcome: isRoadTest && roadTest ? roadTest.result : null,
          };
        });

        // Sort by session date descending (most recent first)
        historyItems.sort((a, b) =>
          new Date(b.session_starts_at).getTime() - new Date(a.session_starts_at).getTime()
        );

        if (!cancelled) setItems(historyItems);
      } catch (e) {
        console.error('Failed to load session history', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (items.length <= 1) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No other reports or results available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Session History
          <Badge variant="secondary" className="text-xs ml-auto">{items.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.map(item => {
          const isRoadTest = item.session_type === 'testing';
          const isCurrent = isRoadTest
            ? item.session_id === currentSessionId
            : item.report_card_id === currentReportCardId;

          const handleClick = () => {
            if (isCurrent) return;
            if (isRoadTest) {
              navigate(`/road-test-results/${item.session_id}`);
            } else if (item.report_card_id) {
              navigate(`/report-cards/${item.report_card_id}`);
            }
          };

          return (
            <button
              key={item.session_id}
              onClick={handleClick}
              disabled={isCurrent}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                isCurrent
                  ? 'bg-primary/10 border-primary/30 cursor-default'
                  : 'bg-card hover:bg-accent/50 border-border cursor-pointer'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">Session {item.sessionNumber}</Badge>
                  <span className="text-sm font-medium">
                    {format(parseISO(item.session_starts_at), 'MMM d, yyyy')}
                  </span>
                  {isRoadTest ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <ClipboardCheck className="h-2.5 w-2.5" />Road Test
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] capitalize">Driving</Badge>
                  )}
                  {isRoadTest && item.road_test_outcome && (
                    <Badge className={`text-[10px] gap-1 border-0 ${
                      item.road_test_outcome === 'passed'
                        ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                        : 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                    }`}>
                      {item.road_test_outcome === 'passed' ? (
                        <><CheckCircle className="h-2.5 w-2.5" />Passed</>
                      ) : (
                        <><XCircle className="h-2.5 w-2.5" />Must Retry</>
                      )}
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                      Currently Viewing
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.instructor_name}
                </p>
              </div>
              {/* Only show score for driving sessions, never for road tests */}
              {!isRoadTest && item.overall && (
                <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  {item.overall}/10
                </div>
              )}
              {!isCurrent && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
