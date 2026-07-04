import { useEffect, useState } from "react";

const CACHE_KEY = "dk_glb_available_v1";
export const GLB_URL = "/assets/dk-car-gold.glb";

/**
 * HEADs the GLB once per session and caches the result.
 * Returns `null` while unknown, `true` if present, `false` if missing.
 * Component swaps to GLB automatically once the file lands (next mount).
 */
export function useGlbAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached === "1" ? true : cached === "0" ? false : null;
  });

  useEffect(() => {
    if (available !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(GLB_URL, { method: "HEAD" });
        const ok = res.ok && !res.headers.get("content-type")?.includes("html");
        if (!cancelled) {
          setAvailable(ok);
          try {
            sessionStorage.setItem(CACHE_KEY, ok ? "1" : "0");
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          setAvailable(false);
          try {
            sessionStorage.setItem(CACHE_KEY, "0");
          } catch {
            /* ignore */
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available]);

  return available;
}
