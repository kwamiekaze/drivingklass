import { useEffect, useReducer, useState } from "react";
import { CloudSun, X } from "lucide-react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { KINDS, KIND_LABEL, PLACE, atmo, effectiveKind, refreshLive, setAdmin, setPreview, subscribe, type WeatherKind } from "./world/atmosphere";

/**
 * Admin-only weather panel. Everyone sees the live weather of Carrollton, Georgia; a logged-in admin can open this panel (menu: "Weather & night")
 * to try any look, and the deeper night, while editing. The choice is kept in the admin's own browser only: visitors always get the live weather.
 */
export function WeatherAdmin() {
  const { role } = usePortalAuth(), admin = role === "admin";
  const [open, setOpen] = useState(false), [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => { setAdmin(admin); if (!admin) setOpen(false); }, [admin]);
  useEffect(() => subscribe(bump), []);
  useEffect(() => { if (!admin) return; const f = () => setOpen(true); window.addEventListener("dk:weather-panel", f); return () => window.removeEventListener("dk:weather-panel", f); }, [admin]);
  if (!admin || !open) return null;
  const live = atmo.live, p = atmo.preview;
  const Btn = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) => <button type="button" className="n2-wx-b" data-on={on} onClick={onClick}>{children}</button>;
  return (
    <div className="n2-wx" role="dialog" aria-label="Weather and night preview">
      <div className="n2-wx-h"><CloudSun size={16} aria-hidden="true" /><b>Weather &amp; night</b><button type="button" className="n2-wx-x" aria-label="Close" onClick={() => setOpen(false)}><X size={15} /></button></div>
      <p className="n2-wx-live">Live in {PLACE.name}: <b>{live ? KIND_LABEL[live.kind] : "loading…"}</b>{live?.tempF != null ? ` · ${live.tempF}°F` : ""} <button type="button" className="n2-wx-r" onClick={() => void refreshLive(true)}>refresh</button></p>
      <div className="n2-wx-l">Weather</div>
      <div className="n2-wx-g">
        <Btn on={p.weather === "live"} onClick={() => setPreview({ weather: "live" })}>Live</Btn>
        {KINDS.map((k: WeatherKind) => <Btn key={k} on={p.weather === k} onClick={() => setPreview({ weather: k })}>{KIND_LABEL[k]}</Btn>)}
      </div>
      <div className="n2-wx-l">Night depth</div>
      <div className="n2-wx-g">
        <Btn on={p.night === "live"} onClick={() => setPreview({ night: "live" })}>Clock (9 pm+)</Btn>
        <Btn on={p.night === "deep"} onClick={() => setPreview({ night: "deep" })}>Darker</Btn>
        <Btn on={p.night === "normal"} onClick={() => setPreview({ night: "normal" })}>Normal</Btn>
      </div>
      <p className="n2-wx-n">Showing: {KIND_LABEL[effectiveKind()]}. Only you see a preview; visitors always get the live weather. The darker night shows in the night theme.</p>
    </div>
  );
}
