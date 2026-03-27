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
  id: string;
  type: 'report_card' | 'road_test';
  created_at: string;
  overall: number | null;
  instructor_id: string;
  instructor_name: string;
  session_starts_at: string | null;
  session_type: string;
  session_id: string;
  sessionNumber: number | null;
  road_test_result?: string | null;
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
        // Fetch report cards and road test results in parallel
        const [reportsRes, roadTestsRes, allSessRes] = await Promise.all([
          supabase
            .from('report_cards')
            .select('id, created_at, overall, instructor_id, session_id')
            .eq('student_id', studentId)
            .eq('report_card_status', 'completed')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('road_test_results')
            .select('id, created_at, session_id, instructor_id, result')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('sessions')
            .select('id, starts_at, session_type')
            .eq('student_id', studentId)
            .neq('status', 'cancelled')
            .order('starts_at', { ascending: true }),
        ]);

        const reports = reportsRes.data || [];
        const roadTests = roadTestsRes.data || [];
        const allSessions = allSessRes.data || [];

        if (cancelled) return;
        if (reports.length === 0 && roadTests.length === 0) {
          setItems([]);
          return;
        }

        // Build session number map
        const sessionNumMap: Record<string, number> = {};
        allSessions.forEach((s: any, i: number) => { sessionNumMap[s.id] = i + 1; });

        // Build session info map
        const sessMap: Record<string, { starts_at: string; session_type: string }> = {};
        allSessions.forEach((s: any) => { sessMap[s.id] = { starts_at: s.starts_at, session_type: s.session_type }; });

        // Collect all instructor IDs
        const instrIds = [...new Set([
          ...reports.map(r => r.instructor_id),
          ...roadTests.map(r => r.instructor_id),
        ])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email')
          .in('id', instrIds);

        const instrMap: Record<string, string> = {};
        (profiles || []).forEach(p => {
          instrMap[p.id] = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Instructor';
        });

        // Track which session IDs already have report cards to avoid duplicates
        const reportSessionIds = new Set(reports.map(r => r.session_id));

        // Build combined list
        const combined: HistoryItem[] = [
          ...reports.map(r => ({
            id: r.id,
            type: 'report_card' as const,
            created_at: r.created_at!,
            overall: r.overall,
            instructor_id: r.instructor_id,
            instructor_name: instrMap[r.instructor_id] || 'Instructor',
            session_starts_at: sessMap[r.session_id]?.starts_at || null,
            session_type: sessMap[r.session_id]?.session_type || 'driving',
            session_id: r.session_id,
            sessionNumber: sessionNumMap[r.session_id] || null,
          })),
          ...roadTests
            .filter(rt => !reportSessionIds.has(rt.session_id)) // Don't duplicate if session has both
            .map(rt => ({
              id: rt.id,
              type: 'road_test' as const,
              created_at: rt.created_at!,
              overall: null,
              instructor_id: rt.instructor_id,
              instructor_name: instrMap[rt.instructor_id] || 'Instructor',
              session_starts_at: sessMap[rt.session_id]?.starts_at || null,
              session_type: 'testing',
              session_id: rt.session_id,
              sessionNumber: sessionNumMap[rt.session_id] || null,
              road_test_result: rt.result,
            })),
        ];

        // Sort by session date descending
        combined.sort((a, b) => {
          const dateA = a.session_starts_at || a.created_at;
          const dateB = b.session_starts_at || b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        if (!cancelled) setItems(combined);
      } catch (e) {
        console.error('Failed to load report card history', e);
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
          const isCurrent = item.type === 'report_card'
            ? item.id === currentReportCardId
            : item.session_id === currentSessionId;

          const handleClick = () => {
            if (isCurrent) return;
            if (item.type === 'road_test') {
              navigate(`/road-test-results/${item.session_id}`);
            } else {
              navigate(`/report-cards/${item.id}`);
            }
          };

          return (
            <button
              key={`${item.type}-${item.id}`}
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
                  {item.sessionNumber && (
                    <Badge variant="outline" className="text-[10px]">Session {item.sessionNumber}</Badge>
                  )}
                  <span className="text-sm font-medium">
                    {item.session_starts_at
                      ? format(parseISO(item.session_starts_at), 'MMM d, yyyy')
                      : format(parseISO(item.created_at), 'MMM d, yyyy')}
                  </span>
                  {item.type === 'road_test' ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <ClipboardCheck className="h-2.5 w-2.5" />Road Test
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] capitalize">{item.session_type}</Badge>
                  )}
                  {item.type === 'road_test' && item.road_test_result && (
                    <Badge className={`text-[10px] gap-1 border-0 ${
                      item.road_test_result === 'passed'
                        ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                        : 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                    }`}>
                      {item.road_test_result === 'passed' ? (
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
              {item.overall && (
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
