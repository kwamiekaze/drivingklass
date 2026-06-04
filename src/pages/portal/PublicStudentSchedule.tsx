import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Calendar, Loader2, Lock, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FullCalendarView, CalendarEvent } from "@/components/portal/FullCalendarView";

interface PublicScheduleSession {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  session_type: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  instructor_name: string;
}

interface PublicScheduleData {
  student_name: string;
  sessions: PublicScheduleSession[];
}

type ViewState = "code_entry" | "viewing" | "not_found";

export default function PublicStudentSchedule() {
  const { slug } = useParams<{ slug: string }>();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("code_entry");
  const [schedule, setSchedule] = useState<PublicScheduleData | null>(null);

  const events: CalendarEvent[] = useMemo(() => (schedule?.sessions || []).map((session) => ({
    id: session.id,
    title: session.session_type === "testing" ? "Road Test" : "Driving Lesson",
    subtitle: `${session.instructor_name} · ${session.status}`,
    start: session.starts_at,
    end: session.ends_at,
    color: "bg-primary/10 text-primary border-l-4 border-primary",
    dotColor: "bg-primary",
  })), [schedule]);

  const sessionsByDate = useMemo(() => {
    const groups = new Map<string, PublicScheduleSession[]>();
    (schedule?.sessions || []).forEach((session) => {
      const key = format(parseISO(session.starts_at), "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) || []), session]);
    });
    return Array.from(groups.entries()).map(([date, sessions]) => ({ date, sessions }));
  }, [schedule]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !accessCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-schedule-access", {
        body: { slug, access_code: accessCode.trim() },
      });
      if (fnError || (data as any)?.error) {
        if ((fnError as any)?.context?.status === 404) setViewState("not_found");
        else setError((data as any)?.error || fnError?.message || "Unable to verify access code.");
        return;
      }
      setSchedule((data as any).schedule);
      setViewState("viewing");
    } catch {
      setError("Unable to verify. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (viewState === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <ThemeToggle />
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="py-12 text-center">
            <ShieldX className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h1 className="text-xl font-semibold mb-2 text-foreground">Schedule Not Available</h1>
            <p className="text-muted-foreground">This schedule is no longer available for public viewing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === "code_entry") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Student Schedule</h1>
              <p className="text-sm text-muted-foreground">Enter the access code provided to view this schedule.</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                placeholder="Enter access code"
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value); setError(""); }}
                className="text-center text-lg tracking-widest h-12"
                autoFocus
                autoComplete="off"
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full cta-button h-12" disabled={loading || !accessCode.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Unlock Schedule
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!schedule) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-bold text-gold-shimmer">DrivingKlass</Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold theme-heading">{schedule.student_name} Schedule</h1>
            <p className="text-sm text-muted-foreground">{schedule.sessions.length} upcoming and completed schedule item{schedule.sessions.length === 1 ? "" : "s"}</p>
          </div>
          <Badge variant="outline" className="w-fit"><Calendar className="h-3 w-3 mr-1" /> Shared schedule</Badge>
        </div>

        <Card className="portal-card">
          <CardHeader><CardTitle className="text-base sm:text-lg">Calendar</CardTitle></CardHeader>
          <CardContent><FullCalendarView events={events} defaultView="month" /></CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader><CardTitle className="text-base sm:text-lg">By date</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sessionsByDate.map((group) => (
              <div key={group.date} className="rounded-lg border p-3 space-y-2">
                <p className="font-medium text-sm">{format(parseISO(`${group.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</p>
                {group.sessions.map((session) => (
                  <div key={session.id} className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{session.session_type === "testing" ? "Road Test" : "Driving Lesson"}</span>
                      <Badge variant="outline">{session.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{format(parseISO(session.starts_at), "h:mm a")} – {format(parseISO(session.ends_at), "h:mm a")}</p>
                    <p className="text-muted-foreground">{session.instructor_name}</p>
                    {session.pickup_address && <p className="text-xs text-muted-foreground">Pickup: {session.pickup_address}</p>}
                    {session.dropoff_address && <p className="text-xs text-muted-foreground">Drop-off: {session.dropoff_address}</p>}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}