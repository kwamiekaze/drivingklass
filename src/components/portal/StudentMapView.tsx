import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDisplayName, getProfileInitials } from "@/lib/profileUtils";
import { format, parseISO } from "date-fns";
import { MapPin, Phone, Mail, Clock, Copy, ExternalLink, Navigation, Eye, Bug, ChevronDown, AlertTriangle } from "lucide-react";
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
  showDebug?: boolean;
}

type PinMode = "pickup" | "dropoff" | "both";

// Default center: Georgia statewide (Atlanta-leaning)
const DEFAULT_CENTER: L.LatLngExpression = [32.9, -83.4];
const DEFAULT_ZOOM = 7;

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

export default function StudentMapView({ students, onOpenProfile, showDebug = false }: StudentMapViewProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [pinMode, setPinMode] = useState<PinMode>("both");
  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  // Students with coordinates for current pin mode
  const mappableStudents = useMemo(() =>
    students.filter(s => {
      const hasPickup = s.pickup_lat != null && s.pickup_lng != null;
      const hasDropoff = s.dropoff_lat != null && s.dropoff_lng != null;
      if (pinMode === "pickup") return hasPickup;
      if (pinMode === "dropoff") return hasDropoff;
      return hasPickup || hasDropoff;
    }), [students, pinMode]);

  // Debug stats
  const debugStats = useMemo(() => {
    const withPickupAddr = students.filter(s => s.pickup_address).length;
    const withDropoffAddr = students.filter(s => s.dropoff_address).length;
    const withAnyAddr = students.filter(s => s.pickup_address || s.dropoff_address).length;
    const withPickupCoords = students.filter(s => s.pickup_lat != null && s.pickup_lng != null).length;
    const withDropoffCoords = students.filter(s => s.dropoff_lat != null && s.dropoff_lng != null).length;
    const withAnyCoords = students.filter(s => (s.pickup_lat != null && s.pickup_lng != null) || (s.dropoff_lat != null && s.dropoff_lng != null)).length;
    const needsGeocode = students.filter(s => (s.pickup_address && s.pickup_lat == null) || (s.dropoff_address && s.dropoff_lat == null)).length;
    const noAddress = students.filter(s => !s.pickup_address && !s.dropoff_address).length;

    return { withPickupAddr, withDropoffAddr, withAnyAddr, withPickupCoords, withDropoffCoords, withAnyCoords, needsGeocode, noAddress };
  }, [students]);

  // Unmapped students list
  const unmappedStudents = useMemo(() => {
    return students.filter(s => {
      const hasPickupCoords = s.pickup_lat != null && s.pickup_lng != null;
      const hasDropoffCoords = s.dropoff_lat != null && s.dropoff_lng != null;
      return !hasPickupCoords && !hasDropoffCoords;
    }).map(s => {
      let reason = "Unknown";
      if (!s.pickup_address && !s.dropoff_address) reason = "No address on file";
      else if (s.pickup_address && s.pickup_lat == null) reason = "Needs geocoding";
      else if (s.dropoff_address && s.dropoff_lat == null) reason = "Needs geocoding (dropoff)";
      return { ...s, reason };
    });
  }, [students]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    });

    tileLayer.on("tileerror", () => {
      console.error("[StudentMapView] Tile load error");
      setTileError(true);
    });

    tileLayer.on("load", () => {
      setTileError(false);
    });

    tileLayer.addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Force invalidateSize after mount
    setMapReady(true);
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
    setTimeout(() => {
      map.invalidateSize();
    }, 1000);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Re-invalidate when container resizes or becomes visible
  useEffect(() => {
    if (!mapInstanceRef.current || !mapRef.current) return;

    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    observer.observe(mapRef.current);

    return () => observer.disconnect();
  }, [mapReady]);

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

      if ((pinMode === "pickup" || pinMode === "both") && student.pickup_lat != null && student.pickup_lng != null) {
        addMarker(student.pickup_lat, student.pickup_lng, "pickup");
      }
      if ((pinMode === "dropoff" || pinMode === "both") && student.dropoff_lat != null && student.dropoff_lng != null) {
        addMarker(student.dropoff_lat, student.dropoff_lng, "dropoff");
      }
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
    } else {
      // Reset to default center if no pins
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
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

  // Determine the appropriate empty state message
  const getEmptyStateMessage = () => {
    if (students.length === 0) {
      return { icon: MapPin, title: "No students found", desc: "No approved students were returned from the database." };
    }
    if (debugStats.withAnyAddr === 0) {
      return { icon: MapPin, title: "No addresses on file", desc: "No approved students have pickup or dropoff addresses saved." };
    }
    if (debugStats.withAnyCoords === 0 && debugStats.withAnyAddr > 0) {
      return { icon: AlertTriangle, title: "Students found, but no coordinates", desc: `${debugStats.withAnyAddr} student(s) have addresses but need geocoding. Use the "Map Students" button above.` };
    }
    if (pinMode === "pickup" && debugStats.withPickupCoords === 0) {
      return { icon: MapPin, title: "No pickup coordinates", desc: "No students have geocoded pickup addresses. Try switching to 'Both' or 'Dropoff' mode." };
    }
    if (pinMode === "dropoff" && debugStats.withDropoffCoords === 0) {
      return { icon: MapPin, title: "No dropoff coordinates", desc: "No students have geocoded dropoff addresses. Try switching to 'Both' or 'Pickup' mode." };
    }
    return { icon: MapPin, title: "No students matched this pin mode", desc: "Try a different pin filter." };
  };

  return (
    <div className="space-y-3">
      {/* Debug Panel — admin only */}
      {showDebug && (
        <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full justify-between">
              <span className="flex items-center gap-1.5"><Bug className="h-3 w-3" /> Map Debug Info</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", debugOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border-dashed border-orange-500/30">
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-medium text-muted-foreground">Total Students</div>
                    <div className="text-lg font-bold">{students.length}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-medium text-muted-foreground">With Address</div>
                    <div className="text-lg font-bold">{debugStats.withAnyAddr}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-medium text-muted-foreground">Geocoded</div>
                    <div className="text-lg font-bold text-green-500">{debugStats.withAnyCoords}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-medium text-muted-foreground">Needs Geocoding</div>
                    <div className="text-lg font-bold text-orange-500">{debugStats.needsGeocode}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>Pickup addresses: <strong>{debugStats.withPickupAddr}</strong></div>
                  <div>Dropoff addresses: <strong>{debugStats.withDropoffAddr}</strong></div>
                  <div>No address: <strong>{debugStats.noAddress}</strong></div>
                  <div>Pickup coords: <strong>{debugStats.withPickupCoords}</strong></div>
                  <div>Dropoff coords: <strong>{debugStats.withDropoffCoords}</strong></div>
                  <div>Pins rendered: <strong>{mappableStudents.length}</strong></div>
                </div>
                {unmappedStudents.length > 0 && (
                  <div className="pt-1">
                    <div className="font-medium text-muted-foreground mb-1">Unmapped Students:</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {unmappedStudents.slice(0, 20).map(s => (
                        <div key={s.id} className="flex items-center justify-between rounded bg-muted/30 px-2 py-1">
                          <span className="truncate">{getDisplayName(s as any, "Student")}</span>
                          <Badge variant="outline" className="text-[9px] shrink-0 ml-2">{s.reason}</Badge>
                        </div>
                      ))}
                      {unmappedStudents.length > 20 && <div className="text-muted-foreground text-center">+{unmappedStudents.length - 20} more</div>}
                    </div>
                  </div>
                )}
                {tileError && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Map tiles failed to load. Check network connection.
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

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
                {mappableStudents.length === 0 && (() => {
                  const msg = getEmptyStateMessage();
                  const Icon = msg.icon;
                  return (
                    <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
                      <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <div className="font-medium">{msg.title}</div>
                      <div className="text-[10px] px-2">{msg.desc}</div>
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Map + Detail Card */}
        <div className="flex-1 relative">
          <Card className="portal-card overflow-hidden">
            <div
              ref={mapRef}
              style={{ minHeight: isMobile ? 420 : 600, width: "100%", zIndex: 1 }}
              className="leaflet-map-container"
            />
          </Card>

          {tileError && (
            <div className="absolute top-2 left-2 z-[1000] bg-destructive/90 text-destructive-foreground text-xs px-3 py-1.5 rounded-md">
              Map tiles failed to load
            </div>
          )}

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
    </div>
  );
}
