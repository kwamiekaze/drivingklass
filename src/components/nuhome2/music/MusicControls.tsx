import { useState } from "react";
import { Settings2, Volume2, VolumeX } from "lucide-react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHomeMusic } from "./useHomeMusic";
import { MusicAdmin } from "./MusicAdmin";

/** The speaker (everyone, once an admin has music on and a track added) and the admin's music settings. The reel button is parked. */
export function MusicControls() {
  const m = useHomeMusic();
  const { role } = usePortalAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin";
  return (
    <div className="n2-ctl" role="group" aria-label="Scene controls">
      {/* the reel button is parked for now: the cuts and the beat-cutting stay in the camera, only the button is gone */}
      {m.available && <button type="button" className={`n2-ctl-btn${m.playing ? " is-on" : ""}`} aria-pressed={m.playing} aria-label={m.playing ? "Mute music" : "Play music"} title={m.playing ? "Mute" : "Unmute"} onClick={() => void m.toggle()}>{m.playing ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}</button>}
      {isAdmin && <button type="button" className="n2-ctl-btn" aria-label="Music settings" title="Music settings" onClick={() => setOpen(true)}><Settings2 size={18} aria-hidden="true" /></button>}
      {open && <MusicAdmin enabled={m.enabled} rows={m.rows} missing={m.missing} onClose={() => setOpen(false)} onChanged={m.refresh} setEnabled={m.setEnabled} />}
    </div>
  );
}
