import { useState } from "react";
import { Film, Settings2, Volume2, VolumeX } from "lucide-react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHomeMusic } from "./useHomeMusic";
import { MusicAdmin } from "./MusicAdmin";
import { cinema, startReel, stopReel } from "../world/reel";

/** The reel button (everyone), the speaker (everyone, once an admin has music on and a track added) and the admin's music settings. */
export function MusicControls() {
  const m = useHomeMusic();
  const { role } = usePortalAuth();
  const [open, setOpen] = useState(false);
  const [reel, setReel] = useState(cinema.reel);
  const isAdmin = role === "admin";
  return (
    <div className="n2-ctl" role="group" aria-label="Scene controls">
      <button type="button" className={`n2-ctl-btn${reel ? " is-on" : ""}`} aria-pressed={reel} aria-label={reel ? "Stop the reel" : "Play the reel: the scene from every angle"} title="Reel" onClick={() => { if (reel) stopReel(); else startReel(); setReel(!reel); }}><Film size={18} aria-hidden="true" /></button>
      {m.available && <button type="button" className={`n2-ctl-btn${m.playing ? " is-on" : ""}`} aria-pressed={m.playing} aria-label={m.playing ? "Mute music" : "Play music"} title={m.playing ? "Mute" : "Unmute"} onClick={() => void m.toggle()}>{m.playing ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}</button>}
      {isAdmin && <button type="button" className="n2-ctl-btn" aria-label="Music settings" title="Music settings" onClick={() => setOpen(true)}><Settings2 size={18} aria-hidden="true" /></button>}
      {open && <MusicAdmin enabled={m.enabled} rows={m.rows} missing={m.missing} onClose={() => setOpen(false)} onChanged={m.refresh} setEnabled={m.setEnabled} />}
    </div>
  );
}
