// Admin overview of all active/recent live tracking sessions.
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioTower, ExternalLink, Square, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  session_id: string;
  guardian_email: string;
  tracking_token: string;
  is_active: boolean;
  update_interval_minutes: number;
  started_at: string;
  ended_at: string | null;
  last_location_at: string | null;
  student: { first_name: string | null; last_name: string | null; full_name: string | null; email: string | null } | null;
  instructor: { first_name: string | null; last_name: string | null; full_name: string | null; email: string | null } | null;
}

export default function AdminLiveTracker() {
  return (
    <ProtectedRoute allowedRoles={["admin", "staff"]}>
      <PortalLayout>
        <Inner />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function Inner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("session_tracking")
      .select("*, student:profiles!session_tracking_student_id_fkey(first_name, last_name, full_name, email), instructor:profiles!session_tracking_instructor_id_fkey(first_name, last_name, full_name, email)")
      .order("started_at", { ascending: false })
      .limit(100);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const forceEnd = async (row: Row) => {
    setBusyId(row.id);
    await supabase.from("session_tracking").update({ is_active: false, ended_at: new Date().toISOString() }).eq("id", row.id);
    toast({ title: "Tracking ended" });
    await load();
    setBusyId(null);
  };

  const name = (p: Row["student"] | Row["instructor"]) =>
    p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "—";

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
        <RadioTower className="h-7 w-7 text-primary" /> Live Lesson Tracker
      </h1>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No tracking sessions yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{name(r.student)} <span className="text-muted-foreground text-sm font-normal">with</span> {name(r.instructor)}</span>
                  {r.is_active ? <Badge className="bg-green-600 hover:bg-green-600">Active</Badge> : <Badge variant="secondary">Ended</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><strong>Guardian:</strong> {r.guardian_email}</div>
                <div><strong>Interval:</strong> every {r.update_interval_minutes} min</div>
                <div><strong>Started:</strong> {format(new Date(r.started_at), "MMM d, h:mm a")}{r.ended_at ? <> · <strong>Ended:</strong> {format(new Date(r.ended_at), "MMM d, h:mm a")}</> : null}</div>
                <div><strong>Last location:</strong> {r.last_location_at ? format(new Date(r.last_location_at), "MMM d, h:mm a") : "—"}</div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => window.open(`${window.location.origin}/tracker/${r.tracking_token}`, "_blank")} className="gap-1">
                    <ExternalLink className="h-3 w-3" /> Open guardian view
                  </Button>
                  {r.is_active ? (
                    <Button size="sm" variant="destructive" onClick={() => forceEnd(r)} disabled={busyId === r.id} className="gap-1">
                      {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />} Force end
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
