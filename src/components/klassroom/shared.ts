import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

export const GOLD = "#c9a24a";
export const GOLD_BRIGHT = "#e8c872";
export const GOLD_DEEP = "#9c7a2e";
export const INK = "#141210";
export const INK_SOFT = "#23201c";
export const IVORY = "#f3ecdc";
export const WALL = "#ece3cf";
export const WOOD = "#7a4f2e";
export const WOOD_DARK = "#4a2f1b";
export const WALNUT = "#5b3a22";

export const SLOGAN = "Where 5-Star Drivers Are Made";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DISPLAY = '"Poppins", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
export const CHALK = '"Caveat", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

/** Shared gold material props: polished, warm, catching the room environment. */
export const goldProps = { color: GOLD, metalness: 1, roughness: 0.22 } as const;
export const brushedGold = { color: "#b8913f", metalness: 1, roughness: 0.38 } as const;
export const blackLacquer = { color: "#131110", metalness: 0.15, roughness: 0.28 } as const;

export function setTracking(context: CanvasRenderingContext2D, value: string) {
  const typed = context as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in typed) typed.letterSpacing = value;
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number, radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function star(context: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner = outer * 0.46) {
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

export function goldGradient(context: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = context.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#f7e3a1");
  g.addColorStop(0.45, "#d8b25a");
  g.addColorStop(0.55, "#b8893a");
  g.addColorStop(1, "#f0d58a");
  return g;
}

/**
 * A canvas-backed texture painted once (or whenever deps change) by `paint`.
 * Returns [texture, canvas] so callers can repaint and flag needsUpdate.
 */
export function useCanvasTexture(
  width: number,
  height: number,
  paint: (context: CanvasRenderingContext2D, width: number, height: number) => void,
  deps: ReadonlyArray<unknown> = [],
) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  }, [width, height]);
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => {
    const context = canvas.getContext("2d");
    if (!context) return;
    paint(context, width, height);
    texture.needsUpdate = true;
    // Fonts may arrive after first paint: repaint once they are ready.
    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (cancelled) return;
        paint(context, width, height);
        texture.needsUpdate = true;
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, texture, ...deps]);
  useEffect(() => () => texture.dispose(), [texture]);
  return [texture, canvas] as const;
}

/** The visitor's local time, ticking on the minute. */
export function useLocalMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const d = new Date();
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60000 - d.getSeconds() * 1000 - d.getMilliseconds() + 30);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}
