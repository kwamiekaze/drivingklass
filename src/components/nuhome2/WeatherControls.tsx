import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { KINDS, KIND_LABEL, PLACE, atmo, effectiveKind, loadSite, refreshLive, saveSite, subscribe, type PreviewState, type WeatherKind } from "./world/atmosphere";

/**
 * The weather controls, used in the admin dashboard (Site controls) and in the floating panel on the home page. What an admin picks here is saved for the whole site:
 * every visitor sees that pattern. "Live" (the default) is the real weather of Carrollton, Georgia. Only admins should be shown this (the table refuses anyone else).
 */
export function WeatherControls() {
  const [, bump] = useReducer((n: number) => n + 1, 0), [busy, setBusy] = useState(false);
  useEffect(() => { void refreshLive(); void loadSite(true); return subscribe(bump); }, []);
  const live = atmo.live, s = atmo.site;
  const set = async (p: Partial<PreviewState>) => {
    setBusy(true); const err = await saveSite(p); setBusy(false);
    if (err) toast.error(/home_weather_settings|relation|schema/i.test(err) ? "Weather settings are not set up yet (run the home_weather_settings migration)." : err); else toast.success("Saved for the whole site");
  };
  const Btn = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) => (
    <button type="button" disabled={busy} data-on={on} onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition-colors disabled:opacity-60 ${on ? "bg-gold text-black border-gold font-semibold" : "border-gold/40 text-foreground hover:bg-gold/10"}`}>{children}</button>
  );
  return (
    <div className="space-y-3 text-sm">
      <p>Real weather in {PLACE.name} right now: <b>{live ? KIND_LABEL[live.kind] : "loading…"}</b>{live?.tempF != null ? ` · ${live.tempF}°F` : ""}{" "}
        <button type="button" className="underline text-xs opacity-80" onClick={() => void refreshLive(true)}>refresh</button></p>
      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-widest opacity-70">Weather pattern</div>
        <div className="flex flex-wrap gap-1.5">
          <Btn on={s.weather === "live"} onClick={() => void set({ weather: "live" })}>Live (Carrollton)</Btn>
          {KINDS.map((k: WeatherKind) => <Btn key={k} on={s.weather === k} onClick={() => void set({ weather: k })}>{KIND_LABEL[k]}</Btn>)}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-widest opacity-70">Night depth</div>
        <div className="flex flex-wrap gap-1.5">
          <Btn on={s.night === "live"} onClick={() => void set({ night: "live" })}>Clock (9 pm+)</Btn>
          <Btn on={s.night === "deep"} onClick={() => void set({ night: "deep" })}>Always darker</Btn>
          <Btn on={s.night === "normal"} onClick={() => void set({ night: "normal" })}>Always normal</Btn>
        </div>
      </div>
      <p className="text-xs opacity-70">Showing now: {KIND_LABEL[effectiveKind()]}. {s.weather === "live" && s.night === "live" ? "Everyone sees the live weather." : "Everyone on the site sees this pattern until you set it back to Live."} The darker night shows in the night theme.</p>
    </div>
  );
}
