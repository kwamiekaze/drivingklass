// Public guardian tracker page — outside all auth providers.
// Reads limited tracking data via a security-definer RPC keyed by the token.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createGoldCarIcon } from "@/lib/goldCarMarker";
import { Loader2, MapPin, Clock, AlertCircle, ShieldX } from "lucide-react";

// Standalone client — this page is outside AuthProvider on purpose.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

interface TrackingSnapshot {
  tracking_id: string;
  is_active: boolean;
  update_interval_minutes: number;
  started_at: string;
  ended_at: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_accuracy: number | null;
  last_location_at: string | null;
  student_first_name: string;
  session_starts_at: string | null;
  session_ends_at: string | null;
  session_status: string;
}

export default function GuardianTrackerPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingSnapshot | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  const fetchSnapshot = async () => {
    if (!token) return;
    const { data: rows, error: err } = await supabase.rpc("get_public_tracking_by_token", { p_token: token });
    if (err) {
      setError("Unable to load tracking session.");
      setLoading(false);
      return;
    }
    const row = Array.isArray(rows) && rows.length ? (rows[0] as TrackingSnapshot) : null;
    if (!row) {
      setError("Invalid or expired tracking link.");
      setLoading(false);
      return;
    }
    setData(row);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSnapshot();
    const t = setInterval(fetchSnapshot, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Init map once we have data
  useEffect(() => {
    if (!data || !mapDivRef.current) return;
    if (mapRef.current) return;
    const center: L.LatLngExpression =
      data.last_latitude != null && data.last_longitude != null
        ? [Number(data.last_latitude), Number(data.last_longitude)]
        : [32.9, -83.4];
    const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: true }).setView(center, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, [data]);

  // Update marker when location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    if (data.last_latitude == null || data.last_longitude == null) return;
    const latlng: L.LatLngExpression = [Number(data.last_latitude), Number(data.last_longitude)];
    if (!markerRef.current) {
      markerRef.current = L.marker(latlng, { icon: createGoldCarIcon(56) }).addTo(map);
      map.setView(latlng, Math.max(map.getZoom(), 15));
    } else {
      markerRef.current.setLatLng(latlng);
      markerRef.current.setIcon(createGoldCarIcon(56));
    }
    if (data.last_accuracy && Number(data.last_accuracy) > 0) {
      const acc = Number(data.last_accuracy);
      if (!accuracyRef.current) {
        accuracyRef.current = L.circle(latlng, {
          radius: acc,
          color: "#d4a017",
          fillColor: "#d4a017",
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(map);
      } else {
        accuracyRef.current.setLatLng(latlng);
        accuracyRef.current.setRadius(acc);
      }
    }
  }, [data?.last_latitude, data?.last_longitude, data?.last_accuracy]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.last_location_at) return "—";
    try {
      return format(new Date(data.last_location_at), "MMM d, h:mm a");
    } catch {
      return "—";
    }
  }, [data?.last_location_at]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldX className="h-10 w-10 text-destructive mb-3" />
        <h1 className="text-xl font-bold mb-2">Tracking unavailable</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{error || "This tracking link is invalid or has expired."}</p>
      </div>
    );
  }

  const ended = !data.is_active || data.session_status === "completed" || data.session_status === "cancelled";
  const hasLocation = data.last_latitude != null && data.last_longitude != null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gold-shimmer">DrivingKlass</span>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">Live Tracker</span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">Guardian view</div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {data.student_first_name}'s lesson
          </h1>
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            <div><strong className="text-foreground">Status:</strong> {ended ? "Tracking ended" : data.session_status}</div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span><strong className="text-foreground">Last updated:</strong> {lastUpdatedLabel}</span>
            </div>
            <div><strong className="text-foreground">Update interval:</strong> every {data.update_interval_minutes} min</div>
          </div>
        </div>

        {ended ? (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>This session tracking has ended.</span>
          </div>
        ) : !hasLocation ? (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>Location not available yet. Please refresh shortly.</span>
          </div>
        ) : null}

        <div
          ref={mapDivRef}
          className="w-full rounded-lg overflow-hidden border border-border/60"
          style={{ height: "60vh", minHeight: 380 }}
        />

        <p className="text-xs text-muted-foreground text-center">
          Approximate location shown. Location may be delayed depending on signal and device permissions.
        </p>
      </main>
    </div>
  );
}
