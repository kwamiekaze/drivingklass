import { useRef, useState } from "react";
import { X, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Row } from "./useHomeMusic";

type Loose = { from: (t: string) => any; storage: typeof supabase.storage };   // eslint-disable-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as Loose;
const SQL_HINT = "The music tables are not set up yet. Apply the migration supabase/migrations/20261005120000_home_music.sql (ask Lovable: \"apply the home_music migration\").";

/** Admin only: switch the home page music on or off, add MP3 or WAV tracks, remove them, put them in order. */
export function MusicAdmin({ enabled, rows, missing, onClose, onChanged, setEnabled }: { enabled: boolean; rows: Row[]; missing: boolean; onClose: () => void; onChanged: () => Promise<void>; setEnabled: (v: boolean) => void }) {
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const run = async (label: string, fn: () => Promise<void>) => { setBusy(label); setErr(""); try { await fn(); await onChanged(); } catch (e) { setErr((e as Error).message || "Something went wrong"); } setBusy(""); };
  const flip = (v: boolean) => run("Saving", async () => { const { error } = await sb.from("home_music_settings").upsert({ id: 1, enabled: v, updated_at: new Date().toISOString() }); if (error) throw error; setEnabled(v); });
  const upload = (files: FileList | null) => { if (!files?.length) return; void run("Uploading", async () => {
    let order = rows.length ? Math.max(...rows.map(r => r.sort_order)) + 1 : 0;
    for (const f of Array.from(files)) {
      if (!/\.(mp3|wav)$/i.test(f.name) && !/audio\/(mpeg|wav|x-wav|wave)/.test(f.type)) throw new Error(`${f.name}: only MP3 or WAV files`);
      if (f.size > 40 * 1024 * 1024) throw new Error(`${f.name}: please keep each track under 40 MB`);
      const path = `${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
      const up = await sb.storage.from("home-music").upload(path, f, { contentType: f.type || (/\.wav$/i.test(f.name) ? "audio/wav" : "audio/mpeg"), upsert: false }); if (up.error) throw up.error;
      const ins = await sb.from("home_music_tracks").insert({ title: f.name.replace(/\.[^.]+$/, ""), file_path: path, sort_order: order++ }); if (ins.error) throw ins.error;
    }
    if (file.current) file.current.value = "";
  }); };
  const remove = (r: Row) => run("Removing", async () => { await sb.storage.from("home-music").remove([r.file_path]); const { error } = await sb.from("home_music_tracks").delete().eq("id", r.id); if (error) throw error; });
  const move = (i: number, d: number) => run("Saving", async () => { const a = rows[i]!, b = rows[i + d]; if (!b) return; await sb.from("home_music_tracks").update({ sort_order: b.sort_order }).eq("id", a.id); await sb.from("home_music_tracks").update({ sort_order: a.sort_order }).eq("id", b.id); });
  const rename = (r: Row, title: string) => title.trim() && title !== r.title && run("Saving", async () => { const { error } = await sb.from("home_music_tracks").update({ title: title.trim() }).eq("id", r.id); if (error) throw error; });
  return (
    <div className="n2-mus-layer" role="dialog" aria-label="Home page music" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="n2-mus">
        <div className="n2-mus-head"><span>Home page music</span><button type="button" className="n2-x" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        {missing ? <p className="n2-mus-note">{SQL_HINT}</p> : <>
          <label className="n2-mus-row"><span>Play music on the home page</span><input type="checkbox" checked={enabled} onChange={(e) => void flip(e.target.checked)} disabled={!!busy} /></label>
          <p className="n2-mus-note">When music plays, the camera cuts to the beat. Visitors get a speaker button and start it with a tap.</p>
          <ul className="n2-mus-list">
            {rows.map((r, i) => <li key={r.id}>
              <input defaultValue={r.title} aria-label="Track title" onBlur={(e) => void rename(r, e.target.value)} />
              <button type="button" aria-label="Move up" disabled={i === 0 || !!busy} onClick={() => void move(i, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1 || !!busy} onClick={() => void move(i, 1)}><ArrowDown size={15} /></button>
              <button type="button" aria-label="Remove track" disabled={!!busy} onClick={() => void remove(r)}><Trash2 size={15} /></button>
            </li>)}
            {!rows.length && <li className="n2-mus-empty">No tracks yet. Add an MP3 or WAV file.</li>}
          </ul>
          <input ref={file} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button type="button" className="n2-btn n2-btn--gold n2-mus-add" disabled={!!busy} onClick={() => file.current?.click()}><Upload size={15} /> Add MP3 or WAV</button>
        </>}
        {busy && <p className="n2-mus-note">{busy}...</p>}{err && <p className="n2-mus-err">{err}</p>}
      </div>
    </div>
  );
}
