import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { engine, type Track } from "./engine";

// the music tables are new, so they are not in the generated types yet
type Loose = { from: (t: string) => any; storage: typeof supabase.storage };   // eslint-disable-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as Loose;
export type Row = { id: string; title: string; file_path: string; sort_order: number };
const publicUrl = (path: string) => sb.storage.from("home-music").getPublicUrl(path).data.publicUrl as string;

export function useHomeMusic() {
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const playing = useSyncExternalStore((f) => engine.subscribe(f), () => engine.playing, () => false);
  const refresh = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([sb.from("home_music_settings").select("enabled").eq("id", 1).maybeSingle(), sb.from("home_music_tracks").select("id,title,file_path,sort_order").order("sort_order").order("created_at")]);
      if (s.error || t.error) { setMissing(true); setReady(true); return; }
      const list = (t.data ?? []) as Row[];
      setEnabled(!!s.data?.enabled); setRows(list); setMissing(false);
      engine.setTracks(list.map((r): Track => ({ id: r.id, title: r.title, url: publicUrl(r.file_path) })));
    } catch { setMissing(true); }
    setReady(true);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  // a visitor who chose music last time gets it back on their first tap anywhere
  useEffect(() => {
    if (!enabled || !rows.length) return;
    let want = false; try { want = localStorage.getItem("n2-music") === "on"; } catch { /* private mode */ }
    if (!want || engine.playing) return;
    const go = () => { void engine.play(); window.removeEventListener("pointerdown", go); };
    window.addEventListener("pointerdown", go, { once: true }); return () => window.removeEventListener("pointerdown", go);
  }, [enabled, rows.length]);
  const toggle = useCallback(async () => { await engine.toggle(); try { localStorage.setItem("n2-music", engine.playing ? "on" : "off"); } catch { /* private mode */ } }, []);
  useEffect(() => { if (!enabled) engine.pause(); }, [enabled]);
  return { enabled, rows, ready, missing, playing, toggle, refresh, available: enabled && rows.length > 0, publicUrl, setEnabled };
}
