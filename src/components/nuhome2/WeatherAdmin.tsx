import { useEffect, useState } from "react";
import { CloudSun, X } from "lucide-react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { WeatherControls } from "./WeatherControls";

/**
 * Admin-only weather panel on the home page (menu: "Weather & night"; the admin dashboard has the same controls under Site controls).
 * Everyone sees the live weather of Carrollton, Georgia unless an admin sets a pattern here: that choice is saved for the whole site.
 */
export function WeatherAdmin() {
  const { role } = usePortalAuth(), admin = role === "admin";
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!admin) { setOpen(false); return; } const f = () => setOpen(true); window.addEventListener("dk:weather-panel", f); if (new URLSearchParams(window.location.search).get("panel") === "weather") setOpen(true); return () => window.removeEventListener("dk:weather-panel", f); }, [admin]);
  if (!admin || !open) return null;
  return (
    <div className="n2-wx" role="dialog" aria-label="Weather and night">
      <div className="n2-wx-h"><CloudSun size={16} aria-hidden="true" /><b>Weather &amp; night</b><button type="button" className="n2-wx-x" aria-label="Close" onClick={() => setOpen(false)}><X size={15} /></button></div>
      <WeatherControls />
    </div>
  );
}
