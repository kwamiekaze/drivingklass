import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import serifBold from 'three/examples/fonts/droid/droid_serif_bold.typeface.json';
import { NightCtx, radialTexture } from './theme';

/*
 * Real signage: letters cut from a classical serif and extruded with a bevel, five-pointed stars with a ridge down every
 * point (so each one catches the light in facets, like cast metal), warm halos that come up at night. One merged mesh per
 * word and one per star row, so a whole sign is two or three draw calls on any phone.
 */
let FONT: Font | null = null;
const font = () => (FONT ??= new FontLoader().parse(serifBold as never));

/** A five point star with a raised ridge to every point and a flat back. Flat shaded, so the facets read as cast metal. */
export function facetedStar(R: number, thick = .34, ridge = .3): THREE.BufferGeometry {
  const rim: [number, number][] = Array.from({ length: 10 }, (_, k) => { const a = Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * .42 : R; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const t = R * thick * .5, h = R * ridge, pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < 10; i++) {
    const [x0, y0] = rim[i]!, [x1, y1] = rim[(i + 1) % 10]!;
    tri([0, 0, t + h], [x0, y0, t], [x1, y1, t]);                       // front facet, centre to the rim
    tri([x0, y0, 0], [x1, y1, 0], [0, 0, 0]);                           // flat back
    tri([x0, y0, 0], [x1, y1, t], [x0, y0, t]); tri([x0, y0, 0], [x1, y1, 0], [x1, y1, t]);   // edge
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

/** A row of stars, the middle one the biggest, merged into one geometry. `sizes` are radii, `gap` is the centre to centre distance. */
export function starRow(sizes: number[], gap: number, thick = .34): THREE.BufferGeometry {
  const parts = sizes.map((R, i) => facetedStar(R, thick).translate((i - (sizes.length - 1) / 2) * gap, 0, 0));
  return mergeGeometries(parts, false)!;
}

/** A word in the sign font, laid out letter by letter with tracking, centred on x, baseline on y = 0 and fitted to `width` metres. */
export function wordGeometry(text: string, width: number, depth: number, bevel: number, tracking = .06, seg = 6): THREE.BufferGeometry {
  const f = font(), size = 1, k = size / f.data.resolution, parts: THREE.BufferGeometry[] = [];
  let x = 0;
  for (const ch of text) {
    const glyph = f.data.glyphs[ch] ?? f.data.glyphs['?']!;
    if (ch !== ' ') {
      const g = new TextGeometry(ch, { font: f, size, depth, curveSegments: seg, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .7, bevelOffset: 0, bevelSegments: 2 });
      g.translate(x, 0, 0); parts.push(g);
    }
    x += glyph.ha * k + tracking;
  }
  const g = mergeGeometries(parts.map(p => { p.deleteAttribute('uv'); return p; }), false)!; g.computeBoundingBox();
  const bb = g.boundingBox!, s = width / (bb.max.x - bb.min.x);
  g.translate(-(bb.max.x + bb.min.x) / 2, 0, 0); g.scale(s, s, s); return g;
}

export const goldMat = (night = false) => new THREE.MeshStandardMaterial({ color: night ? '#c9962e' : '#d9ac3c', metalness: .92, roughness: .3, envMapIntensity: 1.6, emissive: '#ff9a1a', emissiveIntensity: 0 });
export const champagneMat = () => new THREE.MeshStandardMaterial({ color: '#e6d6b2', metalness: .9, roughness: .34, envMapIntensity: 1.5, emissive: '#ffcf80', emissiveIntensity: 0 });

/** Drives a metal's glow from the day and night mix: dark cast metal by day, warm backlit metal at night. */
export function useGlow(mats: THREE.MeshStandardMaterial[], day: number, night: number) {
  const mix = useContext(NightCtx);
  useFrame(() => { const v = day + (night - day) * mix.current; mats.forEach(m => { m.emissiveIntensity = v; }); });
}

/** A soft warm halo behind lettering that comes up at night. */
export function Halo({ position, size, color = '255,190,100', strength = .55 }: { position: [number, number, number]; size: [number, number]; color?: string; strength?: number }) {
  const mix = useContext(NightCtx);
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  const map = useMemo(() => new THREE.CanvasTexture(radialTexture([[0, `rgba(${color},1)`], [.5, `rgba(${color},.38)`], [1, `rgba(${color},0)`]])), [color]);
  useFrame(() => { if (ref.current) ref.current.opacity = strength * (.08 + .92 * mix.current); });
  return <mesh position={position} renderOrder={3}><planeGeometry args={size} /><meshBasicMaterial ref={ref} map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></mesh>;
}

/** A star carved into stone: a V-cut, each point a pair of facets sloping down to a centre `depth` behind the surface. */
export function carvedStar(R: number, depth: number): THREE.BufferGeometry {
  const rim: [number, number][] = Array.from({ length: 10 }, (_, k) => { const a = Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * .42 : R; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const pos: number[] = [];
  for (let i = 0; i < 10; i++) { const [x0, y0] = rim[i]!, [x1, y1] = rim[(i + 1) % 10]!; pos.push(0, 0, -depth, x0, y0, 0, x1, y1, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
/** The outline of a star, flat, for the stencil mask that opens the stone where a carved star sits. */
export function starOutline(R: number): THREE.BufferGeometry {
  const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * .42 : R; if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath();
  return new THREE.ShapeGeometry(s);
}
/** A row of carved stars (and the matching outline row), centre star biggest, outer stars a little lower so the row follows the arch. */
export function carvedRow(sizes: number[], gap: number, drop: number[], depth: number) {
  const place = (g: THREE.BufferGeometry, i: number) => g.translate((i - (sizes.length - 1) / 2) * gap, drop[i] ?? 0, 0);
  return { cut: mergeGeometries(sizes.map((R, i) => place(carvedStar(R, depth * R / Math.max(...sizes)), i)), false)!, mask: mergeGeometries(sizes.map((R, i) => place(starOutline(R), i)), false)! };
}
/** Writes 1 into the stencil buffer wherever a carving is: the stone around it is then drawn everywhere except there. */
export const carveMask = () => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp });
/** Turns a stone material into one with holes where the carvings are. */
export function stencilled<T extends THREE.Material>(m: T): T { const c = m.clone() as T; c.stencilWrite = true; c.stencilRef = 1; c.stencilFunc = THREE.NotEqualStencilFunc; c.stencilFail = THREE.KeepStencilOp; c.stencilZFail = THREE.KeepStencilOp; c.stencilZPass = THREE.KeepStencilOp; return c; }
