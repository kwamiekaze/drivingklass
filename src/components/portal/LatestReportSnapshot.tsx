import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillHighlightsDisplay } from "./SkillHighlightsDisplay";
import { FileText, Star, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

interface LatestReportSnapshotProps {
  studentId: string;
  /** Hide snapshot for this session's own report card */
  currentSessionId?: string;
}

interface SnapshotData {
  id: string;
  created_at: string;
  overall: number | null;
  instructor_id: string;
  instructor_name: string;
  session_starts_at: string | null;
  strongest_skills: any[];
  most_improved_skills: any[];
  focus_areas: any[];
}

export function LatestReportSnapshot({ studentId, currentSessionId }: LatestReportSnapshotProps) {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Fetch the most recent completed driving report for this student
        let query = supabase
          .from('report_cards')
          .select('id, created_at, overall, instructor_id, session_id, strongest_skills, most_improved_skills, focus_areas')
          .eq('student_id', studentId)
          .eq('report_card_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: reports } = await query;
        if (cancelled || !reports || reports.length === 0) {
          if (!cancelled) setSnapshot(null);
          return;
        }

        // Pick the first one that's not this session's report
        const picked = reports.find(r => r.session_id !== currentSessionId) || reports[0];

        // Get instructor name
        const { data: instrProfile } = await supabase
          .from('profiles')
          .select('full_name, first_name, last_name, email')
          .eq('id', picked.instructor_id)
          .single();

        const instrName = instrProfile
          ? (instrProfile.full_name || [instrProfile.first_name, instrProfile.last_name].filter(Boolean).join(' ') || instrProfile.email || 'Instructor')
          : 'Instructor';

        // Get session date
        const { data: sess } = await supabase
          .from('sessions')
          .select('starts_at')
          .eq('id', picked.session_id)
          .single();

        if (!cancelled) {
          setSnapshot({
            id: picked.id,
            created_at: picked.created_at!,
            overall: picked.overall,
            instructor_id: picked.instructor_id,
            instructor_name: instrName,
            session_starts_at: sess?.starts_at || null,
            strongest_skills: Array.isArray(picked.strongest_skills) ? picked.strongest_skills as any[] : [],
            most_improved_skills: Array.isArray(picked.most_improved_skills) ? picked.most_improved_skills as any[] : [],
            focus_areas: Array.isArray(picked.focus_areas) ? picked.focus_areas as any[] : [],
          });
        }
      } catch (e) {
        console.error('Failed to load latest report snapshot', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId, currentSessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Loading latest report…</span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">No previous report cards available yet.</p>
      </div>
    );
  }

  const hasHighlights = snapshot.strongest_skills.length > 0 ||
    snapshot.most_improved_skills.length > 0 ||
    snapshot.focus_areas.length > 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Latest Report Snapshot</p>
          </div>
          {snapshot.overall && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Star className="h-3 w-3 text-yellow-500" />
              {snapshot.overall}/10
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Report Date</p>
            <p className="font-medium">{format(parseISO(snapshot.created_at), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Instructor</p>
            <p className="font-medium">{snapshot.instructor_name}</p>
          </div>
          {snapshot.session_starts_at && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Lesson Date</p>
              <p className="font-medium">{format(parseISO(snapshot.session_starts_at), 'EEEE, MMM d, yyyy')}</p>
            </div>
          )}
        </div>

        {hasHighlights && (
          <>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Use this to guide the current session</p>
            <SkillHighlightsDisplay
              strongest={snapshot.strongest_skills}
              mostImproved={snapshot.most_improved_skills}
              focusAreas={snapshot.focus_areas}
            />
          </>
        )}

        <Link to={`/report-cards/${snapshot.id}`}>
          <Button variant="outline" size="sm" className="w-full min-h-[40px] gap-2 mt-1">
            <FileText className="h-3.5 w-3.5" />
            Open Most Recent Report Card
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
