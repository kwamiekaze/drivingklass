import { useContext, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { NightCtx, radialTexture, rng } from './theme';

const R = 92;

/** Fades every material inside it with the day/night mix. */
function FadeGroup({ day, children }: { day: boolean; children: ReactNode }) {
  const mix = useContext(NightCtx);
  const ref = useRef<THREE.Group>(null);
  const last = useRef(-1);
  useFrame(() => {
    const g = ref.current; if (!g) return;
    const o = day ? 1 - mix.current : mix.current;
    if (Math.abs(o - last.current) < .004) return;
    last.current = o; g.visible = o > .01;
    g.traverse(obj => {
      const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
      if (m) { const base = (m.userData.base ??= m.opacity); m.transparent = true; m.opacity = base * o; }
    });
  });
  return <group ref={ref}>{children}</group>;
}

export function SkyDome() {
  const mix = useContext(NightCtx);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uMix: { value: 0 }, dTop: { value: new THREE.Color('#2b6fcf') }, dMid: { value: new THREE.Color('#86bdee') }, dLow: { value: new THREE.Color('#ffe8c2') }, nTop: { value: new THREE.Color('#02041a') }, nMid: { value: new THREE.Color('#0f1748') }, nLow: { value: new THREE.Color('#382a66') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform float uMix; uniform vec3 dTop,dMid,dLow,nTop,nMid,nLow; void main(){ float h = clamp(abs(vP.y),0.0,1.0); vec3 d = mix(dLow,dMid,smoothstep(0.0,0.3,h)); d = mix(d,dTop,smoothstep(0.25,0.9,h)); vec3 n = mix(nLow,nMid,smoothstep(0.0,0.3,h)); n = mix(n,nTop,smoothstep(0.25,0.9,h)); gl_FragColor = vec4(mix(d,n,uMix),1.0); }',
  }), []);
  useFrame(() => { mat.uniforms.uMix.value = mix.current; });
  return <mesh material={mat} scale={R} renderOrder={-10}><sphereGeometry args={[1, 32, 20]} /></mesh>;
}

/** Thousands of twinkling stars plus a soft milky way band. */
export function Stars({ count = 7000 }: { count?: number }) {
  const mix = useContext(NightCtx);
  const gl = useThree(s => s.gl);
  const { geo, mat } = useMemo(() => {
    const r = rng(7), N = count, band0 = Math.floor(N * .657);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N);
    const tints = [new THREE.Color('#ffffff'), new THREE.Color('#cfe0ff'), new THREE.Color('#ffe9c8'), new THREE.Color('#ffd6e8')];
    const nx = new THREE.Vector3(.3, .8, .5).normalize();
    const u = new THREE.Vector3(1, 0, 0).cross(nx).normalize(), v = nx.clone().cross(u);
    for (let i = 0; i < N; i++) {
      let x: number, y: number, z: number;
      if (i < band0) {
        const yy = Math.pow(r(), .85) * .98 + .02, a = r() * Math.PI * 2, rr = Math.sqrt(1 - yy * yy);
        x = Math.cos(a) * rr; y = yy; z = Math.sin(a) * rr;
      } else {
        const a = r() * Math.PI * 2, g = (r() + r() + r() - 1.5) * .16;
        const p = u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a))).add(nx.clone().multiplyScalar(g)).normalize();
        x = p.x; y = Math.abs(p.y) + .02; z = p.z;
      }
      pos.set([x * 86, y * 86, z * 86], i * 3);
      const t = tints[Math.floor(r() * tints.length)];
      const band = i >= band0;
      const c = band ? new THREE.Color('#b9b3ff').lerp(t, .4) : t;
      col.set([c.r, c.g, c.b], i * 3);
      const k = r();
      size[i] = band ? 1.1 + r() * 1.2 : k > .985 ? 6 + r() * 3 : k > .9 ? 3 + r() * 1.6 : 1.3 + r() * 1.3;
      phase[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: { value: 0 }, uMix: { value: 0 }, uPx: { value: 1 } },
      vertexShader: 'attribute float aSize; attribute float aPhase; attribute vec3 aColor; uniform float uTime,uMix,uPx; varying vec3 vC; varying float vA; void main(){ vC = aColor; float tw = .6 + .4 * sin(uTime * (.5 + aPhase * 1.8) + aPhase * 60.0); vA = tw * uMix; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uPx; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = pow(smoothstep(.5,0.,d),1.7); gl_FragColor = vec4(vC, a * vA); }',
    });
    return { geo: g, mat: m };
  }, [count]);
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; mat.uniforms.uMix.value = Math.max(0, (mix.current - .25) / .75); mat.uniforms.uPx.value = gl.getPixelRatio() * 1.1; });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-9} />;
}

export function ShootingStars() {
  const mix = useContext(NightCtx);
  const ref = useRef<THREE.Mesh>(null);
  const st = useRef({ t: -1, next: 3, dir: new THREE.Vector3(), from: new THREE.Vector3() });
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return;
    const s = st.current;
    if (mix.current < .7) { m.visible = false; return; }
    if (s.t < 0) {
      s.next -= dt;
      if (s.next <= 0) {
        s.t = 0; s.next = 5 + Math.random() * 9;
        const a = Math.random() * Math.PI * 2;
        s.from.set(Math.cos(a) * 70, 40 + Math.random() * 22, Math.sin(a) * 70 - 10);
        s.dir.set(-Math.sin(a), -.22, Math.cos(a)).normalize();
        if (Math.random() > .5) s.dir.multiplyScalar(-1);
      }
      m.visible = false; return;
    }
    s.t += dt;
    const life = s.t / 1.1;
    if (life >= 1) { s.t = -1; m.visible = false; return; }
    m.visible = true;
    m.position.copy(s.from).addScaledVector(s.dir, s.t * 60);
    m.lookAt(0, 0, 0);
    m.rotateZ(Math.atan2(s.dir.y, 1));
    (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(life * Math.PI);
  });
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 8; const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 8); return new THREE.CanvasTexture(c); }, []);
  return <mesh ref={ref} visible={false}><planeGeometry args={[14, .22]} /><meshBasicMaterial map={tex} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>;
}

function moonTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const b = g.createRadialGradient(200, 190, 20, 256, 256, 280);
  b.addColorStop(0, '#fffdf2'); b.addColorStop(.7, '#eee7d2'); b.addColorStop(1, '#cfc6b4');
  g.fillStyle = b; g.fillRect(0, 0, 512, 512);
  const r = rng(3);
  for (let i = 0; i < 9; i++) { const x = 90 + r() * 330, y = 90 + r() * 330, rad = 40 + r() * 70; const m = g.createRadialGradient(x, y, 0, x, y, rad); m.addColorStop(0, 'rgba(150,145,150,.34)'); m.addColorStop(1, 'rgba(150,145,150,0)'); g.fillStyle = m; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512, rad = 5 + r() * 16; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.strokeStyle = 'rgba(120,115,120,.28)'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(170,165,170,.16)'; g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function Moon({ position }: { position: [number, number, number] }) {
  const map = useMemo(moonTexture, []);
  const halo = useMemo(() => new THREE.CanvasTexture(radialTexture([[0, 'rgba(205,222,255,.85)'], [.25, 'rgba(170,195,255,.35)'], [1, 'rgba(120,150,255,0)']])), []);
  const spin = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (spin.current) spin.current.rotation.y += dt * .01; });
  return <FadeGroup day={false}><group position={position}>
    <Billboard><mesh position={[0, 0, -1]}><planeGeometry args={[46, 46]} /><meshBasicMaterial map={halo} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh></Billboard>
    <mesh ref={spin} rotation={[.2, 2.4, 0]}><sphereGeometry args={[6, 48, 32]} /><meshBasicMaterial map={map} fog={false} toneMapped={false} /></mesh>
  </group></FadeGroup>;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r * 2.2);
  s.quadraticCurveTo(x + w, y + h, x + w - r * 2.2, y + h); s.lineTo(x + r * 2.2, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r * 2.2); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** The sun, wearing sunglasses. */
export function Sun({ position }: { position: [number, number, number] }) {
  const glow = useMemo(() => new THREE.CanvasTexture(radialTexture([[0, 'rgba(255,244,190,.95)'], [.3, 'rgba(255,224,130,.4)'], [1, 'rgba(255,200,90,0)']])), []);
  const disc = useMemo(() => new THREE.CanvasTexture(radialTexture([[0, '#fff7c2'], [.7, '#ffd84f'], [1, '#ffb62e']], 512)), []);
  const lens = useMemo(() => new THREE.ShapeGeometry(roundedRect(3.1, 2.1, .55)), []);
  const rays = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (rays.current) rays.current.rotation.z += dt * .06; });
  return <FadeGroup day><group position={position}><Billboard>
    <mesh position={[0, 0, -.3]}><planeGeometry args={[62, 62]} /><meshBasicMaterial map={glow} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
    <group ref={rays} position={[0, 0, -.1]}>
      {Array.from({ length: 16 }).map((_, i) => <mesh key={i} rotation={[0, 0, (i / 16) * Math.PI * 2]}><mesh position={[0, 9.4, 0]}><coneGeometry args={[.85, 3.4, 3]} /><meshBasicMaterial color="#ffd23f" fog={false} toneMapped={false} /></mesh></mesh>)}
    </group>
    <mesh><circleGeometry args={[6.6, 64]} /><meshBasicMaterial map={disc} fog={false} toneMapped={false} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * 1.95, .7, .06]}>
      <mesh geometry={lens}><meshBasicMaterial color="#14101c" fog={false} toneMapped={false} /></mesh>
      <mesh position={[-s * .55, .45, .01]} rotation={[0, 0, s * .5]}><planeGeometry args={[.9, .16]} /><meshBasicMaterial color="#8f86b8" transparent opacity={.75} fog={false} toneMapped={false} /></mesh>
      <mesh position={[s * 1.72, .15, 0]}><planeGeometry args={[2.6, .22]} /><meshBasicMaterial color="#14101c" fog={false} toneMapped={false} /></mesh>
    </group>)}
    <mesh position={[0, .95, .06]}><planeGeometry args={[.9, .24]} /><meshBasicMaterial color="#14101c" fog={false} toneMapped={false} /></mesh>
    <mesh position={[0, -.9, .05]} rotation={[0, 0, Math.PI]}><torusGeometry args={[1.85, .17, 10, 40, Math.PI * .8]} /><meshBasicMaterial color="#b5541f" fog={false} toneMapped={false} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 3.5, -.6, .05]}><circleGeometry args={[.62, 24]} /><meshBasicMaterial color="#ff9c8a" transparent opacity={.55} fog={false} toneMapped={false} /></mesh>)}
  </Billboard></group></FadeGroup>;
}

/** Soft cloud puffs drifting slowly around the whole scene. */
export function Clouds({ count = 26 }: { count?: number }) {
  const mix = useContext(NightCtx);
  const grp = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .35, roughness: 1, transparent: true, opacity: .96 }), []);
  const dayC = useMemo(() => new THREE.Color('#ffffff'), []), nightC = useMemo(() => new THREE.Color('#8d96bd'), []);
  const dayE = useMemo(() => new THREE.Color('#fff4e6'), []), nightE = useMemo(() => new THREE.Color('#252c5c'), []);
  const clouds = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: count }).map((_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * .3, rad = 44 + r() * 40, y = 16 + r() * 24, s = 1.0 + r() * 1.8;
      const puffs = Array.from({ length: 8 + Math.floor(r() * 4) }).map((_, k) => ({ p: [(k - 4) * (.8 + r() * .5), (r() - .35) * 1.1, (r() - .5) * 1.6] as [number, number, number], s: [1.3 + r() * 1.2, .9 + r() * .9, 1.1 + r() * .8] as [number, number, number] }));
      return { pos: [Math.cos(a) * rad, y, Math.sin(a) * rad] as [number, number, number], rot: a + Math.PI / 2, s, puffs };
    });
  }, [count]);
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * .0055;
    const m = mix.current;
    mat.color.copy(dayC).lerp(nightC, m); mat.emissive.copy(dayE).lerp(nightE, m); mat.emissiveIntensity = .38 + .3 * m;
  });
  return <group ref={grp}>
    {clouds.map((c, i) => <group key={i} position={c.pos} rotation-y={c.rot} scale={c.s}>
      {c.puffs.map((q, k) => <mesh key={k} position={q.p} scale={q.s} material={mat}><sphereGeometry args={[1, 14, 10]} /></mesh>)}
    </group>)}
  </group>;
}
