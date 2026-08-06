// Instructor's Live Lesson Tracker page.
// Lists active/upcoming assigned sessions and lets the instructor
// start/stop tracking, choose an interval, and stream browser
// geolocation updates while tracking is active.
import { useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { profileFirstName, guardianFirstName } from "@/lib/nameUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Play, Square, Loader2, RadioTower, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  student_id: string;
  student: { id: string; first_name: string | null; last_name: string | null; full_name: string | null; email: string | null; guardian_email: string | null; guardian_name?: string | null } | null;
}

interface TrackingRow {
  id: string;
  session_id: string;
  guardian_email: string;
  tracking_token: string;
  is_active: boolean;
  update_interval_minutes: number;
  started_at: string;
  ended_at: string | null;
  last_location_at: string | null;
}

export default function InstructorLiveTracker() {
  return (
    <ProtectedRoute allowedRoles={["instructor"]}>
      <PortalLayout>
        <InstructorLiveTrackerContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function InstructorLiveTrackerContent() {
  const { user } = usePortalAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [trackings, setTrackings] = useState<Record<string, TrackingRow>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const nowMinus1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: sessRows } = await supabase
      .from("sessions")
      .select("id, starts_at, ends_at, status, student_id, student:profiles!sessions_student_id_fkey(id, first_name, last_name, full_name, email, guardian_email, guardian_name)")
      .eq("instructor_id", user.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("ends_at", nowMinus1h)
      .lte("starts_at", in24h)
      .order("starts_at", { ascending: true });
    const rows = (sessRows || []) as any as SessionRow[];
    setSessions(rows);

    const ids = rows.map((s) => s.id);
    if (ids.length) {
      const { data: trk } = await supabase
        .from("session_tracking")
        .select("*")
        .in("session_id", ids);
      const map: Record<string, TrackingRow> = {};
      (trk || []).forEach((t: any) => { map[t.session_id] = t as TrackingRow; });
      setTrackings(map);
    } else {
      setTrackings({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <RadioTower className="h-7 w-7 text-primary" /> Live Lesson Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start tracking your active session so a guardian can see the approximate location on a map. Location is only shared while tracking is on.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No active or upcoming sessions to track right now.</CardContent></Card>
      ) : (
        sessions.map((s) => (
          <SessionTrackerCard
            key={s.id}
            session={s}
            tracking={trackings[s.id]}
            busy={busyId === s.id}
            setBusy={(b) => setBusyId(b ? s.id : null)}
            reload={load}
            toast={toast}
          />
        ))
      )}
    </div>
  );
}

function SessionTrackerCard({
  session, tracking, busy, setBusy, reload, toast,
}: {
  session: SessionRow;
  tracking: TrackingRow | undefined;
  busy: boolean;
  setBusy: (b: boolean) => void;
  reload: () => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const studentName = profileFirstName(session.student as any)
    || session.student?.email
    || "Student";
  const guardianName = guardianFirstName(session.student as any);
  const [guardianEmail, setGuardianEmail] = useState<string>(tracking?.guardian_email || session.student?.guardian_email || "");
  const [interval, setInterval] = useState<15 | 30 | 60>((tracking?.update_interval_minutes as any) || 30);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const watchRef = useRef<number | null>(null);
  const lastPushRef = useRef<number>(0);

  const isActive = !!tracking?.is_active;
  const trackingUrl = tracking ? `${window.location.origin}/tracker/${tracking.tracking_token}` : "";

  useEffect(() => {
    if ("permissions" in navigator) {
      // @ts-ignore
      navigator.permissions.query({ name: "geolocation" }).then((s: any) => {
        setPermission(s.state === "granted" ? "granted" : s.state === "denied" ? "denied" : "unknown");
        s.onchange = () => setPermission(s.state === "granted" ? "granted" : s.state === "denied" ? "denied" : "unknown");
      }).catch(() => {});
    }
  }, []);

  // Push locations while tracking active
  useEffect(() => {
    if (!isActive || !tracking) {
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      return;
    }
    if (!("geolocation" in navigator)) return;
    if (watchRef.current != null) return;
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastPushRef.current < 30_000) return; // 30s min gap
        lastPushRef.current = now;
        try {
          await supabase.rpc("record_tracking_location", {
            p_tracking_id: tracking.id,
            p_latitude: pos.coords.latitude,
            p_longitude: pos.coords.longitude,
            p_accuracy: pos.coords.accuracy ?? null,
          });
        } catch (e) { /* silent */ }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission("denied");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => {
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    };
  }, [isActive, tracking?.id]);

  const startTracking = async () => {
    if (!guardianEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guardianEmail)) {
      toast({ title: "Guardian email required", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!("geolocation" in navigator)) {
      toast({ title: "Not supported", description: "This device does not support geolocation.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // Ask permission with a one-shot request
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(() => { setPermission("granted"); resolve(); }, (e) => {
          if (e.code === e.PERMISSION_DENIED) setPermission("denied");
          reject(e);
        }, { enableHighAccuracy: true, timeout: 15_000 });
      });

      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { data: inserted, error: insErr } = await supabase
        .from("session_tracking")
        .insert({
          session_id: session.id,
          student_id: session.student_id,
          instructor_id: (await supabase.auth.getUser()).data.user?.id!,
          guardian_email: guardianEmail,
          tracking_token: token,
          update_interval_minutes: interval,
          is_active: true,
          started_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (insErr) throw insErr;

      const url = `${window.location.origin}/tracker/${token}`;
      // Fire the start email
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "tracking-started",
            recipientEmail: guardianEmail,
            idempotencyKey: `tracking-started-${inserted.id}`,
            templateData: {
              studentName,
              guardianName,
              sessionDateLabel: format(new Date(session.starts_at), "MMM d, yyyy"),
              sessionTimeLabel: format(new Date(session.starts_at), "h:mm a"),
              intervalMinutes: interval,
              trackingUrl: url,
            },
          },
        });
      } catch { /* non-fatal */ }

      await supabase.from("session_tracking").update({ last_email_sent_at: new Date().toISOString() }).eq("id", inserted.id);
      toast({ title: "Tracking started", description: "Guardian has been emailed the secure link." });
      await reload();
    } catch (e: any) {
      toast({ title: "Could not start tracking", description: e.message || "Location permission is required to enable live tracking.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const stopTracking = async () => {
    if (!tracking) return;
    setBusy(true);
    try {
      await supabase
        .from("session_tracking")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", tracking.id);
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "tracking-ended",
            recipientEmail: tracking.guardian_email,
            idempotencyKey: `tracking-ended-${tracking.id}`,
            templateData: { studentName, guardianName, endedAtLabel: "just now" },
          },
        });
      } catch { /* non-fatal */ }
      toast({ title: "Tracking stopped" });
      await reload();
    } finally { setBusy(false); }
  };

  const updateInterval = async (val: 15 | 30 | 60) => {
    setInterval(val);
    if (tracking) {
      await supabase.from("session_tracking").update({ update_interval_minutes: val }).eq("id", tracking.id);
      await reload();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {studentName}</span>
          {isActive ? <Badge className="bg-green-600 hover:bg-green-600">Tracking</Badge> : <Badge variant="secondary">Off</Badge>}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {format(new Date(session.starts_at), "EEE MMM d • h:mm a")} — {format(new Date(session.ends_at), "h:mm a")}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`ge-${session.id}`}>Guardian email</Label>
            <Input id={`ge-${session.id}`} type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} disabled={isActive || busy} placeholder="guardian@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Update interval</Label>
            <Select value={String(interval)} onValueChange={(v) => updateInterval(Number(v) as any)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every 60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Permission: <span className={
            permission === "granted" ? "text-green-600" : permission === "denied" ? "text-destructive" : ""
          }>{permission === "granted" ? "Granted" : permission === "denied" ? "Denied" : "Not requested"}</span>
          {tracking?.last_location_at ? <> · Last location {format(new Date(tracking.last_location_at), "h:mm a")}</> : null}
        </div>

        {isActive && tracking ? (
          <div className="rounded border p-2 flex items-center gap-2 text-xs bg-muted/40">
            <span className="truncate flex-1">{trackingUrl}</span>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(trackingUrl); toast({ title: "Link copied" }); }}><Copy className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(trackingUrl, "_blank")}><ExternalLink className="h-3 w-3" /></Button>
          </div>
        ) : null}

        <div className="flex gap-2">
          {!isActive ? (
            <Button onClick={startTracking} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start tracking
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopTracking} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />} End tracking
            </Button>
          )}
        </div>
        {permission === "denied" ? (
          <p className="text-xs text-destructive">Location permission is required to enable live tracking. Enable it in your browser settings and try again.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
