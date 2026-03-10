import { useState, useEffect, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, MapPin, Loader2, Zap, LocateFixed } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AdminUserProfileModal } from "@/components/portal/AdminUserProfileModal";

const StudentMapView = lazy(() => import("@/components/portal/StudentMapView"));

interface StudentProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  approved_at: string | null;
  last_sign_in_at: string | null;
  hours_remaining: number;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
}

export default function AdminMap() {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      // Get all student user IDs
      const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (!roleData?.length) { setStudents([]); setLoading(false); return; }
      
      const userIds = roleData.map(r => r.user_id);
      
      // Fetch approved students with ANY address (don't require coords)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, email, phone, avatar_url, approval_status, created_at, approved_at, last_sign_in_at, hours_remaining, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng")
        .in("id", userIds)
        .eq("approval_status", "approved");
      
      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast({ title: "Error loading students", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleGeocodeAll = async () => {
    setGeocoding(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/geocode-address`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ geocode_all: true }),
        }
      );
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Geocoding failed');
      
      toast({ title: "Geocoding Complete", description: `${result?.geocoded || 0} students mapped successfully` });
      await fetchStudents();
    } catch (err: any) {
      toast({ title: "Geocoding Failed", description: err.message, variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  };

  const mapped = students.filter(s => (s.pickup_lat != null) || (s.dropoff_lat != null)).length;
  const withAddress = students.filter(s => s.pickup_address || s.dropoff_address).length;
  const needsGeocoding = students.filter(s => 
    (s.pickup_address && s.pickup_lat == null) || 
    (s.dropoff_address && s.dropoff_lat == null)
  ).length;

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PortalLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Student Map</h1>
                <p className="text-sm text-muted-foreground mt-1">View all approved students on the map</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={fetchStudents} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              {needsGeocoding > 0 && (
                <Button onClick={handleGeocodeAll} disabled={geocoding} size="sm" className="gap-1.5">
                  {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Map {needsGeocoding} Students
                </Button>
              )}
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{mapped} mapped</Badge>
            <Badge variant="outline">{withAddress} with address</Badge>
            <Badge variant="outline">{students.length} approved</Badge>
            {needsGeocoding > 0 && (
              <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                <LocateFixed className="h-3 w-3 mr-1" />{needsGeocoding} need geocoding
              </Badge>
            )}
          </div>

          {loading ? (
            <Card className="portal-card">
              <CardContent className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 500 }}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Loading students…</p>
              </CardContent>
            </Card>
          ) : (
            <Suspense fallback={
              <Card className="portal-card">
                <CardContent className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 500 }}>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading map…</p>
                </CardContent>
              </Card>
            }>
              <StudentMapView 
                students={students} 
                onOpenProfile={(id) => { setProfileModalUserId(id); setProfileModalOpen(true); }} 
                showDebug={true}
              />
            </Suspense>
          )}
        </div>
        <AdminUserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} userId={profileModalUserId} onProfileUpdated={fetchStudents} />
      </PortalLayout>
    </ProtectedRoute>
  );
}
