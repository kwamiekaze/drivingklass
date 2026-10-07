import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NightCtx, radialTexture, rng } from './theme';
import { Box, makeCanvasTexture, starShape } from './parts';
import { Hedge, PaintStrip, Topiary, type HedgePlant } from './Lot';

/*
 * The back patio: a limestone terrace behind the building, level with the ground, edged in gold, with a star medallion in front of the
 * back steps, round café tables with chairs and umbrellas, a clipped hedge along the lot side with a gap and two topiaries at the walkway,
 * and strings of warm lights from the building to posts in the hedge. World metres. The building's back wall is at z -20.45 and its cornice at -21.0.
 */
const PX0 = -22.4, PX1 = 22.4, PZ0 = -20.4, PZ1 = -25.2;        // the terrace
const HEDGE_Z = -25.55;
const TABLES: [number, number][] = [[-19, -23.1], [-14, -23.5], [-9.2, -23.1], [9.2, -23.1], [14, -23.5], [19, -23.1]];
const UMBRELLAS = [1, 4, 0, 5];                                    // tables that wear an umbrella
const POSTS = [-21, -14, -7, 7, 14, 21];

const tint = (g: THREE.BufferGeometry, color: string) => { const c = new THREE.Color(color), n = g.attributes.position!.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const join = (parts: THREE.BufferGeometry[]) => { const m = mergeGeometries(parts.map(g => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; }))!; m.computeVertexNormals(); return m; };

const tableGeo = (() => {
  const top = new THREE.CylinderGeometry(.52, .52, .05, 28); top.translate(0, .76, 0);
  const rim = new THREE.CylinderGeometry(.55, .55, .035, 28); rim.translate(0, .735, 0);
  const stem = new THREE.CylinderGeometry(.045, .06, .74, 12); stem.translate(0, .37, 0);
  const base = new THREE.CylinderGeometry(.32, .34, .03, 24); base.translate(0, .015, 0);
  return join([tint(top, '#15306a'), tint(rim, '#d9ab3a'), tint(stem, '#26262b'), tint(base, '#26262b')]);
})();

const chairGeo = (() => {                                            // faces +x (the back is on the -x side)
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push(tint(g, c)); };
  box(.44, .045, .44, 0, .46, 0, '#f1e6cf');                        // cushion
  box(.46, .03, .46, 0, .43, 0, '#6a4a2f');                         // seat
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.035, .43, .035, sx * .2, .215, sz * .2, '#5a3e27');
  box(.04, .42, .44, -.22, .66, 0, '#6a4a2f'); box(.025, .3, .36, -.2, .68, 0, '#f1e6cf');
  return join(parts);
})();

const umbrellaGeo = (() => {
  const pole = new THREE.CylinderGeometry(.025, .025, 2.4, 8); pole.translate(0, 1.2, 0);
  const cone = new THREE.ConeGeometry(1.4, .52, 12, 1, true).toNonIndexed(); cone.translate(0, 2.55, 0);
  const n = cone.attributes.position!.count, col = new Float32Array(n * 3), a = new THREE.Color('#f4ead2'), b = new THREE.Color('#15306a');
  for (let i = 0; i < n; i++) { const c = (Math.floor(i / 3) % 2 ? a : b); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  cone.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tip = new THREE.SphereGeometry(.05, 8, 6); tip.translate(0, 2.84, 0);
  return join([tint(pole, '#26262b'), cone, tint(tip, '#d9ab3a')]);
})();

function paverTexture() {
  const t = makeCanvasTexture(512, 512, (g, w, h) => {
    const r = rng(12); g.fillStyle = '#e4d8c2'; g.fillRect(0, 0, w, h);
    const N = 4, cw = w / N, ch = h / N;
    for (let row = 0; row < N; row++) for (let col = -1; col < N; col++) {
      const x = col * cw + (row % 2) * cw / 2, y = row * ch, v = (r() - .5) * 14;
      g.fillStyle = `rgb(${228 + v},${216 + v},${194 + v})`; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    }
    g.strokeStyle = 'rgba(150,130,104,.55)'; g.lineWidth = 3;
    for (let row = 0; row <= N; row++) { g.beginPath(); g.moveTo(0, row * ch); g.lineTo(w, row * ch); g.stroke(); }
    for (let row = 0; row < N; row++) for (let col = -1; col <= N; col++) { const x = col * cw + (row % 2) * cw / 2; g.beginPath(); g.moveTo(x, row * ch); g.lineTo(x, row * ch + ch); g.stroke(); }
  }, 8, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

const bulbGlow = new THREE.CanvasTexture(radialTexture([[0, 'rgba(255,226,150,1)'], [.35, 'rgba(255,200,100,.4)'], [1, 'rgba(255,180,80,0)']]));

export function BackPatio({ pl }: { pl: HedgePlant }) {
  const mix = useContext(NightCtx);
  const W = PX1 - PX0, D = PZ0 - PZ1, cz = (PZ0 + PZ1) / 2;
  const paver = useMemo(() => { const t = paverTexture(); t.repeat.set(W / 3.2, D / 3.2); return t; }, [W, D]);
  const paverMat = useMemo(() => new THREE.MeshStandardMaterial({ map: paver, roughness: .85, emissive: '#ffcf80', emissiveMap: paver, emissiveIntensity: .04 }), [paver]);
  const goldMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9ab3a', roughness: .4, metalness: .5, emissive: '#ffb830', emissiveIntensity: .05 }), []);
  const starGeo = useMemo(() => { const g = new THREE.ShapeGeometry(starShape(1.0, .45)); g.rotateX(-Math.PI / 2); return g; }, []);
  const tablesRef = useRef<THREE.InstancedMesh>(null), chairsRef = useRef<THREE.InstancedMesh>(null), umbrellasRef = useRef<THREE.InstancedMesh>(null), coreRef = useRef<THREE.InstancedMesh>(null);
  const lights = useMemo(() => {
    const out: [number, number, number][] = [];
    POSTS.forEach(x => { const a = new THREE.Vector3(x, 4.15, PZ0 - .2), b = new THREE.Vector3(x, 3.35, HEDGE_Z), n = 15;
      for (let i = 1; i < n; i++) { const t = i / n; out.push([a.x, a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * .42, a.z + (b.z - a.z) * t]); } });
    return out;
  }, []);
  const wireGeo = useMemo(() => { const pts: number[] = []; POSTS.forEach(x => { const a = new THREE.Vector3(x, 4.15, PZ0 - .2), b = new THREE.Vector3(x, 3.35, HEDGE_Z), n = 24; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const p = (t: number) => [a.x, a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * .42, a.z + (b.z - a.z) * t]; pts.push(...p(t0), ...p(t1)); } }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g; }, []);
  const glowGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lights.flat(), 3)); return g; }, [lights]);
  const glowMat = useMemo(() => new THREE.PointsMaterial({ map: bulbGlow, size: .85, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .15 }), []);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe3a4', toneMapped: false }), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const t = tablesRef.current; if (t) { TABLES.forEach(([x, z], i) => { o.position.set(x, .012, z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); t.setMatrixAt(i, o.matrix); }); t.instanceMatrix.needsUpdate = true; t.computeBoundingSphere(); }
    const c = chairsRef.current; if (c) { let k = 0; TABLES.forEach(([x, z], i) => { const n = i % 2 ? 3 : 4; for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2 + i * .7, rr = .98; o.position.set(x + Math.cos(a) * rr, .012, z + Math.sin(a) * rr); o.rotation.set(0, -a + Math.PI, 0); o.scale.setScalar(1); o.updateMatrix(); c.setMatrixAt(k++, o.matrix); } }); c.count = k; c.instanceMatrix.needsUpdate = true; c.computeBoundingSphere(); }
    const u = umbrellasRef.current; if (u) { UMBRELLAS.forEach((ti, i) => { const [x, z] = TABLES[ti]!; o.position.set(x, .012, z); o.rotation.set(0, i * .5, 0); o.scale.setScalar(1); o.updateMatrix(); u.setMatrixAt(i, o.matrix); }); u.instanceMatrix.needsUpdate = true; u.computeBoundingSphere(); }
    const b = coreRef.current; if (b) { lights.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); b.setMatrixAt(i, o.matrix); }); b.instanceMatrix.needsUpdate = true; b.computeBoundingSphere(); }
  }, [lights]);
  useFrame(() => { const n = mix.current; paverMat.emissiveIntensity = .04 + .16 * n; goldMat.emissiveIntensity = .05 + .5 * n; glowMat.opacity = .12 + .8 * n; coreMat.color.setScalar(.82 + .18 * n).multiply(new THREE.Color('#ffe3a4')); });
  const chairCount = TABLES.reduce((a, _, i) => a + (i % 2 ? 3 : 4), 0);
  return <group>
    {/* the terrace and its gold border */}
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, cz]} material={paverMat} receiveShadow><planeGeometry args={[W, D]} /></mesh>
    <PaintStrip lines={[[0, .14]]} span={1} across="v" color="#d9ab3a" x={0} z={PZ1 + .35} width={W - .7} height={1} repeat={[1, 1]} y={.02} />
    <PaintStrip lines={[[0, .14]]} span={1} across="u" color="#d9ab3a" x={PX0 + .35} z={cz} width={1} height={D - .7} repeat={[1, 1]} y={.02} />
    <PaintStrip lines={[[0, .14]]} span={1} across="u" color="#d9ab3a" x={PX1 - .35} z={cz} width={1} height={D - .7} repeat={[1, 1]} y={.02} />
    {/* the star medallion in front of the back steps */}
    <mesh rotation-x={-Math.PI / 2} position={[0, .019, -24.15]} material={goldMat}><ringGeometry args={[1.28, 1.4, 48]} /></mesh>
    <mesh geometry={starGeo} position={[0, .02, -24.15]} scale={[1.05, 1, 1.05]} material={goldMat} />
    {/* furniture */}
    <instancedMesh ref={tablesRef} args={[tableGeo, undefined, TABLES.length]} castShadow receiveShadow frustumCulled={false}><meshStandardMaterial vertexColors roughness={.5} metalness={.15} /></instancedMesh>
    <instancedMesh ref={chairsRef} args={[chairGeo, undefined, chairCount]} castShadow receiveShadow frustumCulled={false}><meshStandardMaterial vertexColors roughness={.7} /></instancedMesh>
    <instancedMesh ref={umbrellasRef} args={[umbrellaGeo, undefined, UMBRELLAS.length]} castShadow frustumCulled={false}><meshStandardMaterial vertexColors roughness={.75} side={THREE.DoubleSide} /></instancedMesh>
    {/* the clipped hedge on the lot side, open at the walkway, with two topiaries */}
    <Hedge x={-12.3} z={HEDGE_Z} w={20.2} d={.7} h={.95} y={.02} seed={31} pl={pl} density={.8} />
    <Hedge x={12.3} z={HEDGE_Z} w={20.2} d={.7} h={.95} y={.02} seed={32} pl={pl} density={.8} />
    <Topiary x={-2.55} z={HEDGE_Z} y={.02} s={.85} /><Topiary x={2.55} z={HEDGE_Z} y={.02} s={.85} />
    {/* light posts in the hedge and the strings of bulbs from the wall */}
    {POSTS.map(x => <Box key={`po${x}`} p={[x, 1.7, HEDGE_Z]} s={[.09, 3.4, .09]} c="#26262b" m={.5} r={.45} />)}
    <lineSegments geometry={wireGeo}><lineBasicMaterial color="#2a2a2e" /></lineSegments>
    <points geometry={glowGeo} material={glowMat} />
    <instancedMesh ref={coreRef} args={[undefined, undefined, lights.length]} material={coreMat} frustumCulled={false}><sphereGeometry args={[.05, 8, 6]} /></instancedMesh>
  </group>;
}
