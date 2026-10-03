import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NightCtx, radialTexture } from './theme';
import { starShape } from './parts';

/*
 * The string light canopy over the lot, with gold stars instead of bulbs (the Style Van hangs spheres here).
 * A horseshoe of poles in front of the building: the back stays open so the facade and the sign are never covered.
 * World meters. Poles stand on the pavement, wires sag from POLE_H down to POLE_H - SAG, stars hang on the wires.
 *
 * Flicker rules (see the Style Van notes): stars are thick bevelled solids (never single planes), the satin gold
 * is only lightly metallic so there is no mirror glint, wires are real tubes (GL lines crawl), and the night glow is
 * a camera facing halo whose opacity eases, it never pulses fast.
 */
const POLE_H = 6.6;
/** Pole positions (x, z), left rear corner round the front to the right rear corner. All on free pavement. */
export const POLES: [number, number][] = [
  [-26, -12.4], [-35, -8], [-35, -.5], [-35, 6.5], [-27, 11.8], [-18, 11.8], [18, 11.8], [27, 11.8], [35, 6.5], [35, -.5], [35, -8], [26, -12.4],
];
/** The gap over the entrance is one long, deep swag (a smile of stars); the other spans sag gently. */
const sagFor = (len: number) => Math.min(3.4, Math.max(.9, len * .1));

const wireAt = (a: THREE.Vector3, b: THREE.Vector3, t: number, sag = sagFor(Math.hypot(b.x - a.x, b.z - a.z))) =>
  new THREE.Vector3(a.x + (b.x - a.x) * t, POLE_H - sag * 4 * t * (1 - t) - .28, a.z + (b.z - a.z) * t);

function puffyStar(outer: number, depth: number) {
  const g = new THREE.ExtrudeGeometry(starShape(outer, outer * .46), { depth, bevelEnabled: true, bevelThickness: depth * .5, bevelSize: outer * .06, bevelSegments: 2, steps: 1 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

export function StarCanopy({ lite }: { lite: boolean }) {
  const mix = useContext(NightCtx);
  const inst = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.Points>(null);

  const pts = useMemo(() => POLES.map(([x, z]) => new THREE.Vector3(x, 0, z)), []);
  const { stars, wire, finials } = useMemo(() => {
    const per = lite ? 10 : 17;
    const list: { p: THREE.Vector3; s: number; yaw: number; sway: number }[] = [];
    const tubes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!, b = pts[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(5, Math.round(len / 12 * per));
      const curve = new THREE.CatmullRomCurve3(Array.from({ length: 19 }).map((_, k) => wireAt(a, b, k / 18)));
      tubes.push(new THREE.TubeGeometry(curve, 36, .013, 5, false));
      for (let k = 1; k < n; k++) {
        const t = k / n, p = wireAt(a, b, t); p.y -= .2;                                // the star hangs a little below the wire
        list.push({ p, s: .82 + ((i * 7 + k * 13) % 5) * .07, yaw: ((i * 5 + k * 3) % 7 - 3) * .18, sway: (i + k) * .7 });
      }
    }
    return { stars: list, wire: mergeGeometries(tubes)!, finials: pts.map(p => new THREE.Vector3(p.x, POLE_H + .34, p.z)) };
  }, [pts, lite]);

  const starGeo = useMemo(() => puffyStar(.3, .12), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4930a', emissive: '#ffa400', emissiveIntensity: .4, roughness: .48, metalness: .2, flatShading: false }), []);
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a3d0c', roughness: .5, metalness: .4 }), []);
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2216', roughness: .6, metalness: .3 }), []);
  const glowTex = useMemo(() => new THREE.CanvasTexture(radialTexture([[0, 'rgba(255,238,170,1)'], [.35, 'rgba(255,200,90,.45)'], [1, 'rgba(255,180,60,0)']])), []);
  const haloMat = useMemo(() => new THREE.PointsMaterial({ map: glowTex, size: 2.1, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }), [glowTex]);
  const haloGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...stars.map(s => s.p), ...finials].flatMap(v => [v.x, v.y, v.z]), 3)); return g; }, [stars, finials]);
  const count = stars.length + finials.length;

  useLayoutEffect(() => {
    const m = inst.current; if (!m) return; const d = new THREE.Object3D();
    stars.forEach((s, i) => { d.position.copy(s.p); d.rotation.set(0, s.yaw, 0); d.scale.setScalar(s.s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    finials.forEach((p, j) => { d.position.copy(p); d.rotation.set(0, 0, 0); d.scale.setScalar(1.55); d.updateMatrix(); m.setMatrixAt(stars.length + j, d.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [stars, finials]);

  useFrame(({ clock }) => {
    const n = mix.current, t = clock.elapsedTime;
    mat.emissiveIntensity = (.42 + 1.7 * n) * (1 + .05 * Math.sin(t * .8));         // slow shimmer, never a flash
    haloMat.opacity = .08 + .5 * n;
    if (halo.current) halo.current.visible = n > .02 || true;
  });

  return <group>
    {pts.map((p, i) => <mesh key={i} position={[p.x, POLE_H / 2, p.z]} material={poleMat} castShadow={false}><cylinderGeometry args={[.045, .075, POLE_H, 8]} /></mesh>)}
    <mesh geometry={wire} material={wireMat} />
    <instancedMesh ref={inst} args={[starGeo, mat, count]} frustumCulled={false} />
    <points ref={halo} geometry={haloGeo} material={haloMat} frustumCulled={false} renderOrder={4} />
  </group>;
}
