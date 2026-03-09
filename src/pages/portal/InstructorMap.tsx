import { useState, useEffect, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, MapPin, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";

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

export default function InstructorMap() {
  const { toast } = useToast();
  const { user } = usePortalAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get student IDs from sessions assigned to this instructor
      const { data: sessions } = await supabase
        .from("sessions")
        .select("student_id")
        .eq("instructor_id", user.id);
      
      if (!sessions?.length) { setStudents([]); setLoading(false); return; }
      
      const uniqueIds = [...new Set(sessions.map(s => s.student_id))];
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, email, phone, avatar_url, approval_status, created_at, approved_at, last_sign_in_at, hours_remaining, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng")
        .in("id", uniqueIds);
      setStudents(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const mapped = students.filter(s => s.pickup_lat || s.dropoff_lat).length;

  return (
    <ProtectedRoute allowedRoles={["instructor"]}>
      <PortalLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/instructor"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold theme-heading">My Students Map</h1>
                <p className="text-sm text-muted-foreground mt-1">View your assigned students on the map</p>
              </div>
            </div>
            <Button onClick={fetchStudents} variant="outline" size="sm" className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{mapped} mapped</Badge>
            <Badge variant="outline">{students.length} students</Badge>
          </div>

          {loading ? (
            <Card className="portal-card"><CardContent className="p-6 flex items-center justify-center min-h-[500px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
          ) : (
            <Suspense fallback={<Card className="portal-card"><CardContent className="p-6 flex items-center justify-center min-h-[500px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>}>
              <StudentMapView students={students} onOpenProfile={() => {}} />
            </Suspense>
          )}
        </div>
      </PortalLayout>
    </ProtectedRoute>
  );
}
