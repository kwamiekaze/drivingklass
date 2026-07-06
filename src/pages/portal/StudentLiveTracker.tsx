// Student view: read-only status of tracking on their sessions.
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioTower, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string;
  guardian_email: string;
  is_active: boolean;
  update_interval_minutes: number;
  started_at: string;
  ended_at: string | null;
  last_location_at: string | null;
  session: { starts_at: string; ends_at: string; status: string } | null;
}

export default function StudentLiveTracker() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <PortalLayout>
        <Inner />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function Inner() {
  const { user } = usePortalAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("session_tracking")
        .select("id, guardian_email, is_active, update_interval_minutes, started_at, ended_at, last_location_at, session:sessions!session_tracking_session_id_fkey(starts_at, ends_at, status)")
        .eq("student_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
        <RadioTower className="h-7 w-7 text-primary" /> Live Lesson Tracker
      </h1>
      <p className="text-sm text-muted-foreground">
        When your instructor enables tracking, your guardian receives a secure link to view the approximate car location during the lesson. Your instructor controls when tracking starts and stops.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No tracking has been enabled on your sessions yet.</CardContent></Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {r.session ? format(new Date(r.session.starts_at), "EEE MMM d • h:mm a") : "Session"}
                {r.is_active ? <Badge className="bg-green-600 hover:bg-green-600">Active</Badge> : <Badge variant="secondary">Ended</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div><strong>Guardian email used:</strong> {r.guardian_email}</div>
              <div><strong>Update interval:</strong> every {r.update_interval_minutes} min</div>
              <div><strong>Last location update:</strong> {r.last_location_at ? format(new Date(r.last_location_at), "MMM d, h:mm a") : "—"}</div>
              <p className="text-xs text-muted-foreground pt-2">Location shown to your guardian is approximate and may be delayed.</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
