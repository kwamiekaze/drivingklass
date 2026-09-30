import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, rng } from './theme';
import { palette } from './palette';
import { Box, Cyl, FONT, V3, drawSpaced, goldGradient, makeCanvasTexture, starShape, useStarGeometry } from './parts';

/*
 * DrivingKlass Headquarters. Meters, local space: x across, y up, z toward the viewer. World origin is at z -15.
 * Main block  x ±9, z ±4, walls to y 8.6, glass curtain wall on the front (z 4), sign band above it.
 * Wings       x ±(9..20), front face at z 2.2, walls to y 5.2. Left: The Garage. Right: The Klassroom.
 * Tower       3.4 m square shaft behind the front, lantern at y 15.2 to 17.2, spire and star finial above.
 */
const MAIN = { w: 18, d: 4, h: 8.6 };
const WING = { w: 11, h: 5.2, front: 2.2, back: -3.8 };

const dark = '#1d1d24';
const B = (props: Parameters<typeof Box>[0]) => <Box cast={false} {...props} />;

function glassTextures() {
  const W = 2048, H = 760, panes = 8, pw = W / panes, mid = H / 2;
  const base = makeCanvasTexture(W, H, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3f5b78'); sky.addColorStop(.55, '#1c2838'); sky.addColorStop(1, '#10151e');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.055)';
    for (let i = 0; i < 9; i++) { g.save(); g.translate(i * 250 - 120, 0); g.transform(1, 0, -.45, 1, 0, 0); g.fillRect(0, 0, 70 + (i % 3) * 26, H); g.restore(); }
    g.fillStyle = '#c9971f';
    for (let i = 0; i <= panes; i++) g.fillRect(i * pw - 7, 0, 14, H);
    g.fillStyle = '#e3b647'; g.fillRect(0, mid - 9, W, 18); g.fillRect(0, 0, W, 12); g.fillRect(0, H - 14, W, 14);
    g.fillStyle = '#f2c14e'; g.fillRect(W / 2 - 4, mid + 6, 8, H / 2 - 20);          // entrance seam
  }, W > 1024 ? 8 : 4);
  const glow = makeCanvasTexture(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const r = rng(11);
    for (let p = 0; p < panes; p++) for (let f = 0; f < 2; f++) {
      const lobby = f === 1 && (p === 3 || p === 4);
      if (!lobby && r() < .18) continue;
      const x0 = p * pw + 14, y0 = f === 0 ? 20 : mid + 16, w = pw - 28, h = mid - 34;
      const gr = g.createLinearGradient(0, y0, 0, y0 + h);
      gr.addColorStop(0, lobby ? '#fff0c8' : '#ffd38a'); gr.addColorStop(1, lobby ? '#ffc070' : '#c98a3c');
      g.fillStyle = gr; g.globalAlpha = lobby ? 1 : .55 + r() * .4; g.fillRect(x0, y0, w, h);
    }
    g.globalAlpha = 1;
  });
  return { base, glow };
}

function signTextures() {
  const W = 2048, H = 185;
  const draw = (emissive: boolean) => (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = emissive ? '#000' : '#0e0e12'; g.fillRect(0, 0, w, h);
    if (!emissive) { g.strokeStyle = '#c9971f'; g.lineWidth = 5; g.strokeRect(14, 14, w - 28, h - 28); g.strokeStyle = 'rgba(242,193,78,.5)'; g.lineWidth = 2; g.strokeRect(26, 26, w - 52, h - 52); }
    g.font = `800 118px ${FONT}`;
    g.fillStyle = emissive ? '#ffd98a' : goldGradient(g, 36, 150);
    drawSpaced(g, 'DRIVINGKLASS', w / 2, h / 2 + 4, 26);
    const star = starShape(28); g.save();
    [80, w - 80].forEach(cx => { g.save(); g.translate(cx, h / 2); g.scale(1, -1); g.beginPath(); star.getPoints().forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = emissive ? '#ffd98a' : '#f2c14e'; g.fill(); g.restore(); });
    g.restore();
  };
  return { base: makeCanvasTexture(W, H, draw(false)), glow: makeCanvasTexture(W, H, draw(true), 2) };
}

function wingTextures(kind: 'garage' | 'class') {
  const PX = 128, W = WING.w * PX, H = WING.h * PX;
  const base = makeCanvasTexture(W, H, (g) => {
    g.fillStyle = '#22222a'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 40; y < H; y += 64) g.fillRect(0, y, W, 2);
    g.fillStyle = '#0e0e12'; g.fillRect(0, H - 4 * PX + 0, W, 0);
    if (kind === 'garage') {
      [-3.5, 0, 3.5].forEach((bx, i) => {
        const x0 = (WING.w / 2 + bx - 1.45) * PX, w = 2.9 * PX, top = H - 3.7 * PX;
        const inner = g.createLinearGradient(0, top, 0, H); inner.addColorStop(0, '#2a2a30'); inner.addColorStop(.4, '#f7e2b0'); inner.addColorStop(1, '#d9a64e');
        g.fillStyle = inner; g.fillRect(x0, top, w, 3.7 * PX);
        for (let s = 0; s < 6; s++) { g.fillStyle = s % 2 ? '#2d2d36' : '#383842'; g.fillRect(x0, top + s * 0.26 * PX, w, 0.24 * PX); }
        g.fillStyle = '#c9971f'; g.fillRect(x0, top + 6 * 0.26 * PX - 2, w, 8);
        g.strokeStyle = '#e3b647'; g.lineWidth = 9; g.strokeRect(x0 - 5, top - 5, w + 10, 3.7 * PX + 5);
        g.fillStyle = goldGradient(g, top - 70, top - 10); g.font = `800 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x0 + w / 2, top - 38);
      });
    } else {
      [-3.9, -1.3, 1.3, 3.9].forEach(bx => {
        const x0 = (WING.w / 2 + bx - 1.0) * PX, w = 2.0 * PX, top = H - 3.9 * PX, h = 3.2 * PX;
        const gl = g.createLinearGradient(0, top, 0, top + h); gl.addColorStop(0, '#3f5b78'); gl.addColorStop(1, '#151b26');
        g.fillStyle = gl; g.fillRect(x0, top, w, h);
        g.strokeStyle = '#c9971f'; g.lineWidth = 8; g.strokeRect(x0, top, w, h); g.fillStyle = '#c9971f'; g.fillRect(x0 + w / 2 - 3, top, 6, h); g.fillRect(x0, top + h * .42, w, 6);
      });
    }
    g.font = `800 64px ${FONT}`; g.fillStyle = goldGradient(g, 50, 120);
    drawSpaced(g, kind === 'garage' ? 'THE GARAGE' : 'THE KLASSROOM', W / 2, 88, 18);
    g.fillStyle = '#c9971f'; g.fillRect(W / 2 - 360, 144, 720, 4);
  }, 8);
  const glow = makeCanvasTexture(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (kind === 'garage') {
      [-3.5, 0, 3.5].forEach(bx => {
        const x0 = (WING.w / 2 + bx - 1.45) * PX, w = 2.9 * PX, top = H - 3.7 * PX + 6 * 0.26 * PX;
        const inner = g.createLinearGradient(0, top, 0, H); inner.addColorStop(0, '#ffe6b0'); inner.addColorStop(1, '#ffb45a');
        g.fillStyle = inner; g.fillRect(x0, top, w, H - top);
      });
    } else {
      [-3.9, -1.3, 1.3, 3.9].forEach((bx, i) => {
        const x0 = (WING.w / 2 + bx - 1.0) * PX + 10, w = 2.0 * PX - 20, top = H - 3.9 * PX + 10, h = 3.2 * PX - 20;
        const gl = g.createLinearGradient(0, top, 0, top + h); gl.addColorStop(0, '#ffe2a8'); gl.addColorStop(1, '#ffb45a');
        g.globalAlpha = i === 2 ? .7 : 1; g.fillStyle = gl; g.fillRect(x0, top, w, h);
      });
      g.globalAlpha = 1;
    }
    g.font = `800 64px ${FONT}`; g.fillStyle = '#ffd98a'; drawSpaced(g, kind === 'garage' ? 'THE GARAGE' : 'THE KLASSROOM', W / 2, 88, 18);
  }, 2);
  return { base, glow };
}

function checkerTexture() {
  const t = makeCanvasTexture(128, 32, (g) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#f6f3ec' : '#15151a'; g.fillRect(x * 16, y * 16, 16, 16); } }, 4);
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(9, 1); t.magFilter = THREE.NearestFilter; return t;
}

/** A flag that ripples: ripples grow toward the free edge. */
function Flag({ position, dir, tex }: { position: V3; dir: 1 | -1; tex: THREE.Texture }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(2.1, 1.3, 16, 8), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useFrame(({ clock }) => {
    const pos = geo.attributes.position as THREE.BufferAttribute, t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]!, y = base[i * 3 + 1]!, k = (x + 1.05) / 2.1;
      pos.setZ(i, Math.sin(x * 2.6 - t * 3.2 + y * .8) * .16 * k + Math.sin(x * 1.3 - t * 2.1) * .05 * k);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  });
  return <mesh ref={ref} geometry={geo} position={[position[0] + dir * 1.05, position[1], position[2]]} scale={[dir, 1, 1]}>
    <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={.85} />
  </mesh>;
}

function flagTextures() {
  const star = makeCanvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = '#0f0f13'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9971f'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
    const s = starShape(96); g.save(); g.translate(w / 2, h / 2 + 6); g.scale(1, -1); g.beginPath(); s.getPoints().forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = goldGradient(g, -96, 96); g.fill(); g.restore();
  }, 4);
  const check = makeCanvasTexture(512, 320, (g, w, h) => { const c = 64; for (let y = 0; y < h / c; y++) for (let x = 0; x < w / c; x++) { g.fillStyle = (x + y) % 2 ? '#f6f3ec' : '#15151a'; g.fillRect(x * c, y * c, c, c); } }, 4);
  return { star, check };
}

export function HQ({ position, lite }: { position: V3; lite: boolean }) {
  const mix = useContext(NightCtx);
  const glass = useMemo(glassTextures, []);
  const sign = useMemo(signTextures, []);
  const garage = useMemo(() => wingTextures('garage'), []);
  const klass = useMemo(() => wingTextures('class'), []);
  const checker = useMemo(checkerTexture, []);
  const flags = useMemo(flagTextures, []);
  const starGeo = useStarGeometry(.78, .2);
  const finialGeo = useStarGeometry(.6, .16);

  const mats = useMemo(() => ({
    glass: new THREE.MeshPhysicalMaterial({ map: glass.base, emissiveMap: glass.glow, emissive: '#ffffff', emissiveIntensity: .1, roughness: .1, metalness: .5, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.25 }),
    sign: new THREE.MeshStandardMaterial({ map: sign.base, emissiveMap: sign.glow, emissive: '#ffffff', emissiveIntensity: .25, roughness: .4, metalness: .35 }),
    garage: new THREE.MeshStandardMaterial({ map: garage.base, emissiveMap: garage.glow, emissive: '#ffffff', emissiveIntensity: .3, roughness: .5, metalness: .2 }),
    klass: new THREE.MeshStandardMaterial({ map: klass.base, emissiveMap: klass.glow, emissive: '#ffffff', emissiveIntensity: .3, roughness: .35, metalness: .3 }),
    gold: new THREE.MeshStandardMaterial({ color: palette.goldBright, metalness: .92, roughness: .28, emissive: '#d9a030', emissiveIntensity: .2, envMapIntensity: 1.5 }),
    lantern: new THREE.MeshPhysicalMaterial({ color: '#a9c9e8', roughness: .05, metalness: 0, transparent: true, opacity: .32, emissive: '#ffcf80', emissiveIntensity: .1, side: THREE.DoubleSide, depthWrite: false }),
    lamp: [0, 1, 2].map(i => new THREE.MeshStandardMaterial({ color: ['#ff4b3e', '#ffc93a', '#37d36b'][i], emissive: ['#ff2a1a', '#ffb000', '#14c050'][i], emissiveIntensity: .1, roughness: .35 })),
    under: new THREE.MeshStandardMaterial({ color: '#fff2d2', emissive: '#ffc77a', emissiveIntensity: 1.4 }),
    checker: new THREE.MeshStandardMaterial({ map: checker, roughness: .5 }),
  }), [glass, sign, garage, klass, checker]);

  const finial = useRef<THREE.Mesh>(null), beacon = useRef<THREE.Mesh>(null);
  const beaconLight = useRef<THREE.PointLight>(null), doorLight = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, dt) => {
    const n = mix.current, t = clock.elapsedTime;
    mats.glass.emissiveIntensity = .1 + 1.5 * n; mats.sign.emissiveIntensity = .22 + 1.6 * n;
    mats.garage.emissiveIntensity = .3 + 1.25 * n; mats.klass.emissiveIntensity = .3 + 1.3 * n;
    mats.gold.emissiveIntensity = .2 + .5 * n; mats.lantern.emissiveIntensity = .12 + .9 * n; mats.under.emissiveIntensity = 1.2 + 2.2 * n;
    // traffic signal on the tower: green 6 s, yellow 1.6 s, red 5 s
    const c = t % 12.6, on = c < 6 ? 2 : c < 7.6 ? 1 : 0;
    mats.lamp.forEach((m, i) => { m.emissiveIntensity = i === on ? 3.4 : .07; });
    if (finial.current) finial.current.rotation.y += dt * .9;
    if (beacon.current) beacon.current.rotation.y -= dt * 1.4;
    if (beaconLight.current) beaconLight.current.intensity = .5 + 9 * n + Math.sin(t * 2.2) * .4 * n;
    if (doorLight.current) doorLight.current.intensity = .7 + 4.4 * n;
  });

  const cap = MAIN.h, towerY0 = cap, towerH = 6.6;
  return <group position={position}>
    {/* plinth and checkered band */}
    <B p={[0, .175, 0]} s={[MAIN.w + .5, .35, MAIN.d * 2 + .5]} c="#14141a" r={.5} />
    <B p={[0, .5, 4.08]} s={[MAIN.w, .3, .04]} c="#ffffff" mat={mats.checker} />
    {/* main block */}
    <B p={[0, MAIN.h / 2, 0]} s={[MAIN.w, MAIN.h, MAIN.d * 2]} c={dark} r={.55} />
    <mesh position={[0, .35 + 3.125, MAIN.d + .03]} material={mats.glass}><planeGeometry args={[16.8, 6.25]} /></mesh>
    <B p={[0, 7.52, MAIN.d + .14]} s={[17.2, 1.74, .22]} c="#0e0e12" r={.5} m={.2} />
    <mesh position={[0, 7.52, MAIN.d + .26]} material={mats.sign}><planeGeometry args={[16.6, 1.5]} /></mesh>
    <mesh position={[0, cap - .2, 0]} castShadow={false} material={mats.gold}><boxGeometry args={[MAIN.w + .7, .42, MAIN.d * 2 + .7]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (MAIN.w / 2 + .1), 4.3, MAIN.d + .02]} material={mats.gold}><boxGeometry args={[.36, 8.2, .34]} /></mesh>)}
    {/* five stars on the roofline */}
    {[-3.6, -1.8, 0, 1.8, 3.6].map((x, i) => <mesh key={i} position={[x, cap + .62, MAIN.d - .5]} geometry={starGeo} material={mats.gold} castShadow={false} />)}
    {/* entrance canopy, doors and runner */}
    <B p={[0, 3.78, MAIN.d + 1.75]} s={[6.4, .22, 3.5]} c="#15151a" r={.4} m={.4} />
    <mesh position={[0, 3.92, MAIN.d + 1.75]} material={mats.gold}><boxGeometry args={[6.6, .1, 3.7]} /></mesh>
    <mesh position={[0, 3.66, MAIN.d + 1.75]} material={mats.under}><boxGeometry args={[5.9, .04, 3]} /></mesh>
    {[-2.8, 2.8].map(x => <mesh key={x} position={[x, 1.9, MAIN.d + 3.3]} material={mats.gold}><cylinderGeometry args={[.1, .1, 3.7, 16]} /></mesh>)}
    <B p={[0, .03, MAIN.d + 1.9]} s={[2.5, .02, 3.4]} c="#16161c" r={.6} receive={false} />
    {[-1.3, 1.3].map(x => <B key={x} p={[x, .035, MAIN.d + 1.9]} s={[.06, .02, 3.4]} c={palette.goldBright} m={1} r={.3} receive={false} />)}
    {/* wings */}
    {[-1, 1].map(s => {
      const cz = (WING.front + WING.back) / 2, d = WING.front - WING.back;
      return <group key={s}>
        <B p={[s * 14.5, WING.h / 2, cz]} s={[WING.w, WING.h, d]} c={dark} r={.55} />
        <mesh position={[s * 14.5, WING.h / 2, WING.front + .03]} material={s < 0 ? mats.garage : mats.klass}><planeGeometry args={[WING.w, WING.h]} /></mesh>
        <mesh position={[s * 14.5, WING.h + .14, cz]} material={mats.gold}><boxGeometry args={[WING.w + .5, .3, d + .5]} /></mesh>
        <B p={[s * 14.5, .175, cz]} s={[WING.w + .4, .35, d + .4]} c="#14141a" r={.5} />
        <B p={[s * 14.5, WING.h + .5, cz + .3]} s={[5, .06, 1.4]} c="#fff" e="#ffd08a" ei={1.4} r={.3} cast={false} />
      </group>;
    })}
    {/* control tower: shaft, bands, traffic signal, lantern, spire */}
    <B p={[0, towerY0 + towerH / 2, -.5]} s={[3.4, towerH, 3.4]} c="#1a1a21" r={.45} m={.25} />
    {[.6, 3.1, 5.6].map(y => <mesh key={y} position={[0, towerY0 + y, -.5]} material={mats.gold}><boxGeometry args={[3.56, .16, 3.56]} /></mesh>)}
    <B p={[0, towerY0 + 2.6, 1.42]} s={[1.0, 2.8, .36]} c="#0b0b0e" r={.4} />
    {[0, 1, 2].map(i => <mesh key={i} position={[0, towerY0 + 3.45 - i * .85, 1.62]} material={mats.lamp[i]}><circleGeometry args={[.3, 28]} /></mesh>)}
    <mesh position={[0, towerY0 + towerH + 1.0, -.5]} material={mats.lantern}><boxGeometry args={[3.7, 2.0, 3.7]} /></mesh>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 1.85, towerY0 + towerH + 1.0, -.5 + sz * 1.85]} material={mats.gold}><boxGeometry args={[.16, 2.1, .16]} /></mesh>))}
    <mesh position={[0, towerY0 + towerH + .05, -.5]} material={mats.gold}><boxGeometry args={[3.9, .14, 3.9]} /></mesh>
    <mesh position={[0, towerY0 + towerH + 2.05, -.5]} material={mats.gold}><boxGeometry args={[3.9, .14, 3.9]} /></mesh>
    <mesh ref={beacon} position={[0, towerY0 + towerH + 1.0, -.5]} geometry={finialGeo} material={mats.gold} scale={1.1} />
    <mesh position={[0, towerY0 + towerH + 2.75, -.5]} rotation-y={Math.PI / 4} material={mats.gold}><coneGeometry args={[2.7, 1.5, 4]} /></mesh>
    <mesh position={[0, towerY0 + towerH + 4.4, -.5]} material={mats.gold}><cylinderGeometry args={[.04, .07, 2.3, 10]} /></mesh>
    <mesh ref={finial} position={[0, towerY0 + towerH + 5.75, -.5]} geometry={finialGeo} material={mats.gold} />
    {/* flags */}
    {[-1, 1].map(s => <group key={s}>
      <Cyl p={[s * 7.4, 3.8, MAIN.d + 2.6]} r={.05} rb={.07} h={7.6} c={palette.goldBright} m={1} rough={.25} cast={false} />
      <mesh position={[s * 7.4, 7.65, MAIN.d + 2.6]} material={mats.gold}><sphereGeometry args={[.11, 12, 10]} /></mesh>
      <Flag position={[s * 7.4, 6.85, MAIN.d + 2.6]} dir={s as 1 | -1} tex={s < 0 ? flags.star : flags.check} />
    </group>)}
    <pointLight ref={beaconLight} position={[0, towerY0 + towerH + 1, 1.2]} color="#ffd27a" distance={30} decay={1.6} intensity={.5} />
    {!lite && <pointLight ref={doorLight} position={[0, 3.2, MAIN.d + 2.6]} color="#ffc98f" distance={14} decay={1.7} intensity={.7} />}
  </group>;
}
