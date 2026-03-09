import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDisplayName, getProfileInitials } from "@/lib/profileUtils";
import { format, parseISO } from "date-fns";
import { MapPin, Phone, Mail, Clock, Copy, ExternalLink, User, Navigation, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface StudentMapViewProps {
  students: StudentProfile[];
  onOpenProfile: (userId: string) => void;
}

type PinMode = "pickup" | "dropoff" | "both";

function createStudentIcon(student: StudentProfile, type: "pickup" | "dropoff"): L.DivIcon {
  const initials = getProfileInitials(student as any);
  const color = type === "pickup" ? "#d4a017" : "#3b82f6";
  const avatarUrl = student.avatar_url;

  const html = avatarUrl
    ? `<div style="width:36px;height:36px;border-radius:50%;border:3px solid ${color};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:#1a1a1a;">
         <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:12px;font-weight:700;color:${color};background:#1a1a1a;\\'>${initials}</div>'"/>
       </div>`
    : `<div style="width:36px;height:36px;border-radius:50%;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${color};background:#1a1a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
         ${initials}
       </div>`;

  return L.divIcon({
    html,
    className: "student-map-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export default function StudentMapView({ students, onOpenProfile }: StudentMapViewProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [pinMode, setPinMode] = useState<PinMode>("pickup");

  // Students with coordinates
  const mappableStudents = useMemo(() =>
    students.filter(s =>
      (pinMode === "pickup" && s.pickup_lat && s.pickup_lng) ||
      (pinMode === "dropoff" && s.dropoff_lat && s.dropoff_lng) ||
      (pinMode === "both" && ((s.pickup_lat && s.pickup_lng) || (s.dropoff_lat && s.dropoff_lng)))
    ), [students, pinMode]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.7128, -74.006],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    mappableStudents.forEach(student => {
      const addMarker = (lat: number, lng: number, type: "pickup" | "dropoff") => {
        const marker = L.marker([lat, lng], { icon: createStudentIcon(student, type) });
        marker.on("click", () => setSelectedStudent(student));
        markersRef.current?.addLayer(marker);
        bounds.push([lat, lng]);
      };

      if ((pinMode === "pickup" || pinMode === "both") && student.pickup_lat && student.pickup_lng) {
        addMarker(student.pickup_lat, student.pickup_lng, "pickup");
      }
      if ((pinMode === "dropoff" || pinMode === "both") && student.dropoff_lat && student.dropoff_lng) {
        addMarker(student.dropoff_lat, student.dropoff_lng, "dropoff");
      }
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
    }
  }, [mappableStudents, pinMode]);

  const centerOnStudent = useCallback((student: StudentProfile) => {
    if (!mapInstanceRef.current) return;
    const lat = student.pickup_lat || student.dropoff_lat;
    const lng = student.pickup_lng || student.dropoff_lng;
    if (lat && lng) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
      setSelectedStudent(student);
    }
  }, []);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast({ title: "Copied", description: "Address copied to clipboard" });
  };

  const openInMaps = (addr: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Approved</Badge>;
      case "pending": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Pending</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Rejected</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className={cn("flex gap-4", isMobile ? "flex-col" : "flex-row")}>
      {/* Sidebar */}
      <Card className={cn("portal-card shrink-0", isMobile ? "w-full" : "w-72")}>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pins</span>
            <Badge variant="secondary" className="text-xs">{mappableStudents.length} mapped</Badge>
          </div>

          {/* Pin Mode */}
          <Select value={pinMode} onValueChange={v => setPinMode(v as PinMode)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border z-50">
              <SelectItem value="pickup">Pickup Pins</SelectItem>
              <SelectItem value="dropoff">Dropoff Pins</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>

          {/* Student list */}
          <ScrollArea className={cn(isMobile ? "max-h-48" : "max-h-[calc(100vh-400px)]")}>
            <div className="space-y-1">
              {mappableStudents.map(s => (
                <button
                  key={s.id}
                  onClick={() => centerOnStudent(s)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-muted/50 transition-colors",
                    selectedStudent?.id === s.id && "bg-primary/10 border border-primary/20"
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={s.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{getProfileInitials(s as any)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{getDisplayName(s as any, "Student")}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{s.pickup_address || s.dropoff_address || "No address"}</div>
                  </div>
                </button>
              ))}
              {mappableStudents.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No students with mapped addresses
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Map + Detail Card */}
      <div className="flex-1 relative">
        <Card className="portal-card overflow-hidden">
          <div ref={mapRef} className={cn("w-full", isMobile ? "h-[60vh]" : "h-[calc(100vh-340px)] min-h-[500px]")} />
        </Card>

        {/* Student detail card */}
        {selectedStudent && (
          <Card className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[1000] portal-card shadow-xl border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedStudent.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">{getProfileInitials(selectedStudent as any)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{getDisplayName(selectedStudent as any, "Student")}</div>
                    {getStatusBadge(selectedStudent.approval_status)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedStudent(null)}>
                  <span className="text-xs">✕</span>
                </Button>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {selectedStudent.pickup_address && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-medium text-primary shrink-0 mt-0.5">PICKUP</span>
                    <span className="flex-1">{selectedStudent.pickup_address}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyAddress(selectedStudent.pickup_address!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openInMaps(selectedStudent.pickup_address!)}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {selectedStudent.dropoff_address && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-medium text-blue-400 shrink-0 mt-0.5">DROPOFF</span>
                    <span className="flex-1">{selectedStudent.dropoff_address}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyAddress(selectedStudent.dropoff_address!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openInMaps(selectedStudent.dropoff_address!)}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {!selectedStudent.pickup_address && !selectedStudent.dropoff_address && (
                  <span className="text-muted-foreground">No addresses on file</span>
                )}

                <div className="flex items-center gap-4 pt-1">
                  {selectedStudent.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedStudent.phone}</span>}
                  {selectedStudent.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{selectedStudent.email}</span></span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(selectedStudent.hours_remaining ?? 0).toFixed(1)}h remaining</span>
                  {selectedStudent.approved_at && <span>Approved {format(parseISO(selectedStudent.approved_at), "MMM d, yyyy")}</span>}
                </div>

                {/* Primary mapped address label */}
                {selectedStudent.pickup_address && !selectedStudent.dropoff_address && (
                  <div className="text-[10px] italic text-muted-foreground">Primary mapped address: Pickup</div>
                )}
                {!selectedStudent.pickup_address && selectedStudent.dropoff_address && (
                  <div className="text-[10px] italic text-muted-foreground">Primary mapped address: Dropoff</div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 text-xs gap-1" onClick={() => onOpenProfile(selectedStudent.id)}>
                  <Eye className="h-3 w-3" /> View Student
                </Button>
                {(selectedStudent.pickup_address || selectedStudent.dropoff_address) && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openInMaps(selectedStudent.pickup_address || selectedStudent.dropoff_address!)}>
                    <Navigation className="h-3 w-3" /> Maps
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
