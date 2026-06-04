import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Calendar, Check, Copy, Loader2, Lock, Search, Share2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Session } from "@/types/portal";
import { getDisplayName } from "@/lib/profileUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FullCalendarView, CalendarEvent } from "@/components/portal/FullCalendarView";

interface StudentFullScheduleSectionProps {
  students: Profile[];
  currentUserId: string | null | undefined;
  heading?: string;
}

interface ScheduleShare {
  id: string;
  student_id: string;
  is_public: boolean;
  public_share_slug: string | null;
  public_access_code: string | null;
}

const generateSlug = () => `student-schedule-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

export function StudentFullScheduleSection({ students, currentUserId, heading = "Students full schedule" }: StudentFullScheduleSectionProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [share, setShare] = useState<ScheduleShare | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedStudentId && students.length > 0) setSelectedStudentId(students[0].id);
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) fetchSchedule(selectedStudentId);
  }, [selectedStudentId]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || null;

  const fetchSchedule = async (studentId: string) => {
    setLoading(true);
    setError("");
    const [{ data: sessionData, error: sessionError }, { data: shareData }] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)")
        .eq("student_id", studentId)
        .order("starts_at", { ascending: true }),
      (supabase as any)
        .from("student_schedule_shares")
        .select("id, student_id, is_public, public_share_slug, public_access_code")
        .eq("student_id", studentId)
        .maybeSingle(),
    ]);

    if (sessionError) {
      setError(sessionError.message);
      setSessions([]);
    } else {
      setSessions((sessionData || []) as Session[]);
    }
    setShare((shareData as ScheduleShare) || null);
    setLoading(false);
  };

  const events: CalendarEvent[] = useMemo(() => sessions.map((session) => ({
    id: session.id,
    title: session.session_type === "testing" ? "Road Test" : "Driving Lesson",
    subtitle: `${getDisplayName(session.instructor, "Instructor")} · ${session.status}`,
    start: session.starts_at,
    end: session.ends_at,
    color: session.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary border-l-4 border-primary",
    dotColor: session.status === "completed" ? "bg-primary" : "bg-muted-foreground",
    meta: { session },
  })), [sessions]);

  const sessionsByDate = useMemo(() => {
    const groups = new Map<string, Session[]>();
    sessions.forEach((session) => {
      const key = format(parseISO(session.starts_at), "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) || []), session]);
    });
    return Array.from(groups.entries()).map(([date, daySessions]) => ({ date, sessions: daySessions }));
  }, [sessions]);

  const publicUrl = share?.public_share_slug ? `${window.location.origin}/schedule/public/${share.public_share_slug}` : "";

  const saveShare = async (makePublic: boolean) => {
    if (!selectedStudentId || !currentUserId) return;
    setError("");
    if (makePublic) {
      if (accessCode.trim().length < 4) {
        setError("Access code must be at least 4 characters.");
        return;
      }
      if (accessCode.trim() !== confirmCode.trim()) {
        setError("Access code and confirmation must match.");
        return;
      }
    }

    setSavingShare(true);
    const payload = {
      student_id: selectedStudentId,
      is_public: makePublic,
      public_share_slug: makePublic ? (share?.public_share_slug || generateSlug()) : null,
      public_access_code: makePublic ? accessCode.trim() : null,
      public_enabled_at: makePublic ? new Date().toISOString() : null,
      created_by: share?.id ? undefined : currentUserId,
      updated_by: currentUserId,
    };
    Object.keys(payload).forEach((key) => (payload as any)[key] === undefined && delete (payload as any)[key]);

    const { error: saveError } = await (supabase as any)
      .from("student_schedule_shares")
      .upsert(payload, { onConflict: "student_id" });

    setSavingShare(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setAccessCode("");
    setConfirmCode("");
    await fetchSchedule(selectedStudentId);
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="portal-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            {heading}
          </CardTitle>
          <Badge variant="outline">{sessions.length} item{sessions.length === 1 ? "" : "s"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>{getDisplayName(student, "Student")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedStudent && (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 min-h-[44px] bg-muted/30">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate max-w-[220px]">{selectedStudent.email}</span>
            </div>
          )}
        </div>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="rounded-lg border p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-medium flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Public sharing</p>
              <p className="text-xs text-muted-foreground">Share this student’s schedule by link and access code.</p>
            </div>
            {share?.is_public ? <Badge>Public</Badge> : <Badge variant="secondary">Private</Badge>}
          </div>

          {share?.is_public && publicUrl && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={publicUrl} readOnly className="min-h-[44px]" />
              <Button variant="outline" onClick={copyLink} className="gap-2 min-h-[44px]">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy
              </Button>
              <Button variant="secondary" onClick={() => saveShare(false)} disabled={savingShare} className="min-h-[44px]">Make private</Button>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="Access code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="min-h-[44px]" />
            <Input placeholder="Confirm access code" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} className="min-h-[44px]" />
            <Button onClick={() => saveShare(true)} disabled={savingShare || !selectedStudentId} className="gap-2 min-h-[44px]">
              {savingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {share?.is_public ? "Update code" : "Make public"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading schedule...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No schedule items found for this student.</div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <FullCalendarView events={events} defaultView="month" />
            <div className="space-y-3">
              <h3 className="font-medium">By date</h3>
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {sessionsByDate.map((group) => (
                  <div key={group.date} className="rounded-lg border p-3 space-y-2">
                    <p className="font-medium text-sm">{format(parseISO(`${group.date}T00:00:00`), "EEEE, MMMM d, yyyy")}</p>
                    {group.sessions.map((session) => (
                      <div key={session.id} className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{session.session_type === "testing" ? "Road Test" : "Driving Lesson"}</span>
                          <Badge variant={session.status === "cancelled" ? "secondary" : "outline"}>{session.status}</Badge>
                        </div>
                        <p className="text-muted-foreground">{format(parseISO(session.starts_at), "h:mm a")} – {format(parseISO(session.ends_at), "h:mm a")}</p>
                        <p className="text-muted-foreground">{getDisplayName(session.instructor, "Instructor")}</p>
                        {(session as any).pickup_address && <p className="text-xs text-muted-foreground">Pickup: {(session as any).pickup_address}</p>}
                        {(session as any).dropoff_address && <p className="text-xs text-muted-foreground">Drop-off: {(session as any).dropoff_address}</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}