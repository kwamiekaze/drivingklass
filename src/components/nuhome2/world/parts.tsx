import { useMemo } from 'react';
import * as THREE from 'three';

export type V3 = [number, number, number];

type BoxProps = { p: V3; s: V3; c: string; m?: number; r?: number; cast?: boolean; receive?: boolean; rot?: V3; e?: string; ei?: number; mat?: THREE.Material };

/** Plain box primitive. Cheap and crisp: hard edges read as architecture, not toys. */
export function Box({ p, s, c, m = 0, r = .6, cast = true, receive = true, rot, e, ei = 0, mat }: BoxProps) {
  return <mesh position={p} rotation={rot} castShadow={cast} receiveShadow={receive} material={mat}>
    <boxGeometry args={s} />
    {!mat && <meshStandardMaterial color={c} metalness={m} roughness={r} emissive={e ?? '#000000'} emissiveIntensity={ei} />}
  </mesh>;
}

export function Cyl({ p, r, h, c, m = 0, rough = .5, seg = 20, cast = true, rb }: { p: V3; r: number; h: number; c: string; m?: number; rough?: number; seg?: number; cast?: boolean; rb?: number }) {
  return <mesh position={p} castShadow={cast} receiveShadow><cylinderGeometry args={[r, rb ?? r, h, seg]} /><meshStandardMaterial color={c} metalness={m} roughness={rough} /></mesh>;
}

/** Flat 5 point star outline with optional thickness. Point up. */
export function starShape(outer: number, inner = outer * .42) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

export function useStarGeometry(outer: number, depth: number, bevel = depth * .22) {
  return useMemo(() => {
    const g = new THREE.ExtrudeGeometry(starShape(outer), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [outer, depth, bevel]);
}

/**
 * Canvas texture that redraws itself once the brand font arrives, so lettering is never stuck in a fallback face.
 * The draw function must fully paint the canvas every call.
 */
export const SIGN_FONT = '"Cinzel", "Cormorant Garamond", Georgia, serif';
export function makeCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, aniso = 8, text = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  const redraw = () => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
  if (text && typeof document !== 'undefined' && document.fonts) {
    Promise.all([document.fonts.load('800 100px Poppins'), document.fonts.load('700 100px Cinzel')]).then(redraw).catch(() => {});
  }
  return t;
}

export const FONT = '"Poppins", "Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Letters drawn one by one so spacing is identical in every browser. */
export function drawSpaced(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, spacing: number) {
  const widths = [...text].map(ch => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  [...text].forEach((ch, i) => { g.fillText(ch, x, cy); x += widths[i]! + spacing; });
}

export function goldGradient(g: CanvasRenderingContext2D, y0: number, y1: number) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff3c4'); gr.addColorStop(.35, '#f2c14e'); gr.addColorStop(.7, '#c9971f'); gr.addColorStop(1, '#8b6508');
  return gr;
}
