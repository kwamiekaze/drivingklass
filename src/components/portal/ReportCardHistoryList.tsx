import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Star, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ReportCardHistoryListProps {
  studentId: string;
  currentReportCardId?: string;
  /** If true, uses public slug navigation instead of internal routes */
  isPublicView?: boolean;
  /** Current slug for public view, to highlight current */
  currentSlug?: string;
}

interface HistoryItem {
  id: string;
  created_at: string;
  overall: number | null;
  instructor_id: string;
  instructor_name: string;
  session_starts_at: string | null;
  session_type: string;
  session_number: number | null;
  public_share_slug: string | null;
}

export function ReportCardHistoryList({ studentId, currentReportCardId, isPublicView, currentSlug }: ReportCardHistoryListProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const query = supabase
          .from('report_cards')
          .select('id, created_at, overall, instructor_id, session_id, public_share_slug')
          .eq('student_id', studentId)
          .eq('report_card_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50);

        // For public view, only show reports that are public
        if (isPublicView) {
          query.eq('is_public', true).not('public_share_slug', 'is', null);
        }

        const { data: reports } = await query;

        if (cancelled || !reports || reports.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        // Fetch instructor names and session info in batch
        const instrIds = [...new Set(reports.map(r => r.instructor_id))];
        const sessIds = reports.map(r => r.session_id).filter(Boolean);

        const [instrRes, sessRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, first_name, last_name, email').in('id', instrIds),
          sessIds.length > 0
            ? supabase.from('sessions').select('id, starts_at, session_type').in('id', sessIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const instrMap: Record<string, string> = {};
        (instrRes.data || []).forEach(p => {
          instrMap[p.id] = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Instructor';
        });

        const sessMap: Record<string, { starts_at: string; session_type: string }> = {};
        (sessRes.data || []).forEach(s => {
          sessMap[s.id] = { starts_at: s.starts_at, session_type: s.session_type };
        });

        // Compute session numbers: get all non-cancelled sessions for this student
        let allSessions: Array<{ id: string; starts_at: string }> = [];
        if (sessIds.length > 0) {
          const { data: allSessData } = await supabase
            .from('sessions')
            .select('id, starts_at')
            .eq('student_id', studentId)
            .neq('status', 'cancelled')
            .order('starts_at', { ascending: true });
          allSessions = allSessData || [];
        }
        
        const sessionNumberMap = new Map<string, number>();
        allSessions.forEach((s, i) => {
          sessionNumberMap.set(s.id, i + 1);
        });

        if (!cancelled) {
          setItems(reports.map(r => ({
            id: r.id,
            created_at: r.created_at!,
            overall: r.overall,
            instructor_id: r.instructor_id,
            instructor_name: instrMap[r.instructor_id] || 'Instructor',
            session_starts_at: sessMap[r.session_id]?.starts_at || null,
            session_type: sessMap[r.session_id]?.session_type || 'driving',
            session_number: sessionNumberMap.get(r.session_id) || null,
            public_share_slug: r.public_share_slug,
          })));
        }
      } catch (e) {
        console.error('Failed to load report card history', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId, isPublicView]);

  if (loading) {
    return (
      <Card className={isPublicView ? "border-border/50 bg-card/80 backdrop-blur" : ""}>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (items.length <= 1 && !isPublicView) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report Card History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No other report cards available.</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  const handleClick = (item: HistoryItem) => {
    if (isPublicView && item.public_share_slug) {
      // Navigate to the public report card, reload to trigger access code check
      window.location.href = `/report/public/${item.public_share_slug}`;
    } else {
      navigate(`/report-cards/${item.id}`);
    }
  };

  return (
    <Card className={isPublicView ? "border-border/50 bg-card/80 backdrop-blur" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {isPublicView ? 'Previous Report Cards' : 'Report Card History'}
          <Badge variant="secondary" className="text-xs ml-auto">{items.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.map(item => {
          const isCurrent = isPublicView
            ? item.public_share_slug === currentSlug
            : item.id === currentReportCardId;
          return (
            <button
              key={item.id}
              onClick={() => { if (!isCurrent) handleClick(item); }}
              disabled={isCurrent}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                isCurrent
                  ? 'bg-primary/10 border-primary/30 cursor-default'
                  : 'bg-card hover:bg-accent/50 border-border cursor-pointer'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.session_number && (
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      Session {item.session_number}
                    </Badge>
                  )}
                  <span className="text-sm font-medium">
                    {item.session_starts_at
                      ? format(parseISO(item.session_starts_at), 'MMM d, yyyy')
                      : format(parseISO(item.created_at), 'MMM d, yyyy')}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">{item.session_type}</Badge>
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
