import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, radialTexture, rng } from './theme';
import { palette } from './palette';
import { Box, SIGN_FONT, V3, makeCanvasTexture, useStarGeometry } from './parts';

/*
 * DrivingKlass Headquarters. Local meters: x across, y up, z toward the viewer; world origin of the building is z -16.
 * Centre block  x ±9.6, z ±4, top 10.9. Limestone piers, a 14.8 x 7.2 m glass atrium, a cedar sign band with five stars.
 * Lantern       glass cupola on the roof with a dark hip roof and an antenna.
 * Wings         x ±(9.6..22.6), front face z 2.6, 6.9 m tall. Left: garage bays with white cars. Right: the lounge.
 */
const CB = { hw: 9.6, hd: 4, top: 10.9 };
const GL = { hw: 7.4, y0: .3, h: 7.2 };
const WING = { x0: 9.6, w: 13, h: 6.9, front: 2.6, back: -3.6 };

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

function ficus(g: CanvasRenderingContext2D, r: () => number, x: number, base: number, hgt: number, rad: number) {
  g.fillStyle = '#3a2412'; g.fillRect(x - hgt * .018, base - hgt * .6, hgt * .036, hgt * .6);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = r() * rad * .8;
    g.fillStyle = ['#27491f', '#33642b', '#427a35', '#58963f'][Math.floor(r() * 4)]!;
    g.beginPath(); g.arc(x + Math.cos(a) * d, base - hgt * .75 + Math.sin(a) * d * .8, rad * (.28 + r() * .22), 0, 7); g.fill();
  }
}

function pendant(g: CanvasRenderingContext2D, x: number, y0: number, y1: number) {
  g.strokeStyle = 'rgba(40,24,10,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  const gr = g.createRadialGradient(x, y1, 2, x, y1, 34); gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(.35, 'rgba(255,226,160,.85)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr; g.fillRect(x - 36, y1 - 36, 72, 72);
}

function tableSet(g: CanvasRenderingContext2D, x: number, base: number, s: number) {
  g.fillStyle = '#3d2614'; g.fillRect(x - s * .5, base - s * .62, s, s * .07);           // top
  g.fillRect(x - s * .03, base - s * .55, s * .06, s * .55);                                // stem
  g.fillStyle = 'rgba(255,214,150,.55)'; g.fillRect(x - s * .5, base - s * .62, s, s * .012);
  [-1, 1].forEach(d => { g.fillStyle = '#4a2f1a'; rr(g, x + d * s * .74 - s * .13, base - s * .5, s * .26, s * .06, 4); g.fill(); g.fillRect(x + d * s * .74 - s * .12, base - s * .5, s * .03, s * .5); g.fillRect(x + d * s * .74 + s * .09, base - s * .5, s * .03, s * .5); g.fillRect(x + d * s * .74 - s * .13, base - s * .86, s * .26, s * .05); });
}

function whiteCar(g: CanvasRenderingContext2D, cx: number, by: number, w: number) {
  const h = w * .46;
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(cx, by, w * .56, w * .05, 0, 0, 7); g.fill();
  g.fillStyle = '#1b1b1f'; g.fillRect(cx - w * .46, by - h * .16, w * .13, h * .16); g.fillRect(cx + w * .33, by - h * .16, w * .13, h * .16);   // tyres
  g.fillStyle = '#f2f2ef'; rr(g, cx - w * .5, by - h * .62, w, h * .48, w * .07); g.fill();                                                          // body
  g.beginPath(); g.moveTo(cx - w * .37, by - h * .6); g.lineTo(cx - w * .27, by - h); g.lineTo(cx + w * .27, by - h); g.lineTo(cx + w * .37, by - h * .6); g.closePath(); g.fill();
  g.fillStyle = '#2a3340'; g.beginPath(); g.moveTo(cx - w * .31, by - h * .62); g.lineTo(cx - w * .24, by - h * .94); g.lineTo(cx + w * .24, by - h * .94); g.lineTo(cx + w * .31, by - h * .62); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - w * .2, by - h * .9, w * .14, h * .04);
  g.fillStyle = '#fff7dc'; rr(g, cx - w * .44, by - h * .5, w * .2, h * .1, 5); g.fill(); rr(g, cx + w * .24, by - h * .5, w * .2, h * .1, 5); g.fill();   // headlights
  g.fillStyle = '#26262b'; rr(g, cx - w * .2, by - h * .47, w * .4, h * .13, 4); g.fill();                                                             // grille
  g.fillStyle = '#d9d9d6'; g.fillRect(cx - w * .13, by - h * .24, w * .26, h * .07);
}

function atriumTexture() {
  const W = 2048, H = 996;
  return makeCanvasTexture(W, H, (g) => {
    const r = rng(21);
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#5a3d22'); wall.addColorStop(.16, '#e3b06a'); wall.addColorStop(.5, '#ffd9a0'); wall.addColorStop(.82, '#f0bd78'); wall.addColorStop(1, '#8a5a30');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W / 2, H * .3, 10, W / 2, H * .3, W * .42); glow.addColorStop(0, 'rgba(255,244,210,.8)'); glow.addColorStop(1, 'rgba(255,244,210,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    // upper level back wall: warm panels
    for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(120,78,40,${.10 + r() * .06})`; g.fillRect(i * 128 + 6, 70, 116, 290); }
    // mezzanine slab and rail
    g.fillStyle = '#3a2516'; g.fillRect(0, 392, W, 34); g.fillStyle = 'rgba(255,214,150,.6)'; g.fillRect(0, 426, W, 4);
    g.fillStyle = 'rgba(70,44,22,.55)'; for (let x = 0; x < W; x += 52) g.fillRect(x, 356, 3, 36);
    g.fillRect(0, 354, W, 4);
    // downlights
    for (let x = 64; x < W; x += 128) { const gr = g.createRadialGradient(x, 52, 1, x, 52, 26); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(x - 26, 26, 52, 52); }
    // chandelier
    g.strokeStyle = 'rgba(60,36,14,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, 170); g.stroke();
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, len = 70 + (i % 3) * 38; const x = W / 2 + Math.cos(a) * len * 1.3, y = 200 + Math.sin(a) * len * .8; g.strokeStyle = 'rgba(255,236,180,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W / 2, 200); g.lineTo(x, y); g.stroke(); const gr = g.createRadialGradient(x, y, 1, x, y, 14); gr.addColorStop(0, 'rgba(255,252,235,1)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(x - 14, y - 14, 28, 28); }
    // plants and furniture
    ficus(g, r, 250, 820, 560, 170); ficus(g, r, 1800, 820, 600, 180); ficus(g, r, 600, 820, 330, 110); ficus(g, r, 1450, 820, 330, 110);
    ficus(g, r, 120, 392, 230, 90); ficus(g, r, 1930, 392, 230, 90);
    [330, 560, 820, 1230, 1490, 1730].forEach((x, i) => tableSet(g, x, 820 + (i % 2) * 10, 120));
    g.fillStyle = '#3d2614'; g.fillRect(860, 680, 330, 130); g.fillStyle = 'rgba(255,214,150,.6)'; g.fillRect(860, 680, 330, 6);   // reception
    // floor
    const fl = g.createLinearGradient(0, H * .84, 0, H); fl.addColorStop(0, 'rgba(120,76,36,0)'); fl.addColorStop(1, 'rgba(98,62,30,.9)'); g.fillStyle = fl; g.fillRect(0, H * .84, W, H * .16);
    // mullions and transoms
    g.fillStyle = '#14110e';
    for (let k = 0; k <= 8; k++) g.fillRect(k * 256 - 6, 0, 12, H);
    g.fillRect(0, 392, W, 10); g.fillRect(0, H - 470, W, 12); g.fillRect(0, H - 14, W, 14); g.fillRect(0, 0, W, 10);
    // doors
    g.strokeStyle = '#14110e'; g.lineWidth = 12; g.strokeRect(859, H - 464, 330, 464);
    g.fillStyle = '#e8c372'; g.fillRect(1004, H - 250, 6, 90); g.fillRect(1038, H - 250, 6, 90);
    // reflections of the sky
    const sk = g.createLinearGradient(0, 0, 0, H * .55); sk.addColorStop(0, 'rgba(150,190,240,.26)'); sk.addColorStop(1, 'rgba(150,190,240,0)'); g.fillStyle = sk; g.fillRect(0, 0, W, H * .55);
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 6; i++) { g.save(); g.translate(i * 380 - 100, 0); g.transform(1, 0, -.5, 1, 0, 0); g.fillRect(0, 0, 90 + (i % 3) * 30, H); g.restore(); }
  }, 8, false);
}

function wingTexture(kind: 'garage' | 'lounge') {
  const W = 1560, H = 830;
  return makeCanvasTexture(W, H, (g) => {
    const r = rng(kind === 'garage' ? 31 : 41);
    g.fillStyle = '#26262b'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.03)'; for (let y = 250; y < H; y += 60) g.fillRect(0, y, W, 2);
    // cedar fascia
    for (let y = 0; y < 200; y += 20) { g.fillStyle = `hsl(${27 + r() * 4},${48 + r() * 8}%,${36 + r() * 9}%)`; g.fillRect(0, y, W, 20); g.fillStyle = 'rgba(30,14,4,.5)'; g.fillRect(0, y, W, 2); }
    g.fillStyle = '#1b1918'; g.fillRect(0, 200, W, 34); g.fillStyle = '#ffcf8a'; g.fillRect(0, 234, W, 4);
    const bays: [number, number, number, number][] = kind === 'garage' ? [[70, 300, 650, 512], [830, 300, 650, 512]] : [0, 1, 2, 3].map(k => [60 + k * 385, 320, 330, 470] as [number, number, number, number]);
    bays.forEach(([x, y, w, h], bi) => {
      g.fillStyle = '#121114'; g.fillRect(x - 12, y - 12, w + 24, h + 12);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#d7a45f'); gr.addColorStop(.35, '#ffe2ae'); gr.addColorStop(1, '#f0c688'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      const cg = g.createRadialGradient(x + w / 2, y + 40, 4, x + w / 2, y + 40, w * .7); cg.addColorStop(0, 'rgba(255,250,230,.7)'); cg.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = cg; g.fillRect(x, y, w, h);
      const n = kind === 'garage' ? 6 : 3;
      for (let i = 0; i < n; i++) { const lx = x + (i + .5) * (w / n); const lg = g.createRadialGradient(lx, y + 24, 1, lx, y + 24, 22); lg.addColorStop(0, 'rgba(255,252,238,1)'); lg.addColorStop(1, 'rgba(255,224,160,0)'); g.fillStyle = lg; g.fillRect(lx - 22, y + 2, 44, 44); }
      if (kind === 'garage') {
        g.fillStyle = 'rgba(150,110,60,.35)'; g.fillRect(x, y + h - 90, w, 90);
        whiteCar(g, x + w * .27, y + h - 34, 250); whiteCar(g, x + w * .73, y + h - 34, 250);
        g.fillStyle = '#3d2a18'; g.fillRect(x + w / 2 - 6, y + 80, 12, h - 170);
      } else {
        pendant(g, x + w * .3, y, y + 120); pendant(g, x + w * .7, y, y + 100);
        ficus(g, r, x + w * .12, y + h - 10, 210, 60);
        tableSet(g, x + w * .42, y + h - 12, 100); if (bi % 2 === 0) tableSet(g, x + w * .8, y + h - 10, 88);
      }
      g.fillStyle = '#121114';
      const cols = kind === 'garage' ? 5 : 2, rows = kind === 'garage' ? 3 : 2;
      for (let c = 1; c < cols; c++) g.fillRect(x + (w / cols) * c - 4, y, 8, h);
      for (let rw = 1; rw < rows; rw++) g.fillRect(x, y + (h / rows) * rw - 4, w, 8);
    });
    [30, 1530].forEach(x => { const gr = g.createRadialGradient(x, 470, 2, x, 470, 70); gr.addColorStop(0, 'rgba(255,214,140,.95)'); gr.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = gr; g.fillRect(x - 70, 400, 140, 140); g.fillStyle = '#ffe2ae'; g.fillRect(x - 8, 440, 16, 60); });
  }, 8, false);
}

function woodTexture() {
  const t = makeCanvasTexture(512, 512, (g, w, h) => {
    const r = rng(7), n = 16, sw = w / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `hsl(${26 + r() * 4},${46 + r() * 10}%,${36 + r() * 10}%)`; g.fillRect(i * sw, 0, sw, h);
      for (let k = 0; k < 46; k++) { g.fillStyle = `rgba(60,30,10,${.05 + r() * .09})`; g.fillRect(i * sw + r() * sw, r() * h, 1 + r() * 1.5, 20 + r() * 140); }
      g.fillStyle = 'rgba(28,12,4,.6)'; g.fillRect(i * sw, 0, 3, h); g.fillStyle = 'rgba(255,218,168,.12)'; g.fillRect(i * sw + 3, 0, 2, h);
    }
  }, 8, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function stoneTexture() {
  const t = makeCanvasTexture(256, 512, (g, w, h) => {
    const r = rng(3); g.fillStyle = '#cfc2a8'; g.fillRect(0, 0, w, h);
    const rows = 10, rh = h / rows;
    for (let y = 0; y < rows; y++) { const off = (y % 2) * w / 4; for (let x = -1; x < 3; x++) { g.fillStyle = `hsl(${38 + r() * 6},${20 + r() * 10}%,${74 + r() * 9}%)`; g.fillRect(x * (w / 2) + off + 2, y * rh + 2, w / 2 - 4, rh - 4); } }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,100,70,${.05 + r() * .08})`; g.fillRect(r() * w, r() * h, 2, 2); }
  }, 8, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function lettersTexture() {
  const W = 2048, H = 256;
  return makeCanvasTexture(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    g.font = `700 150px ${SIGN_FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const text = 'DRIVINGKLASS', sp = 34, ws = [...text].map(c => g.measureText(c).width), total = ws.reduce((a, b) => a + b, 0) + sp * (text.length - 1);
    let x = (W - total) / 2;
    const gr = g.createLinearGradient(0, 40, 0, 216); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(.55, '#fff0cc'); gr.addColorStop(1, '#ffd98a');
    [...text].forEach((c, i) => {
      g.shadowColor = 'rgba(255,200,110,.95)'; g.shadowBlur = 26; g.fillStyle = gr; g.fillText(c, x, H / 2 + 6);
      g.shadowColor = 'rgba(40,20,4,.65)'; g.shadowBlur = 6; g.shadowOffsetY = 4; g.fillText(c, x, H / 2 + 6); g.shadowOffsetY = 0;
      x += ws[i]! + sp;
    });
  }, 8);
}

function doorSignTexture(open: boolean) {
  return makeCanvasTexture(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0b0b0d'; rr(g, 8, 8, w - 16, h - 16, 30); g.fill();
    g.strokeStyle = '#f2c14e'; g.lineWidth = 4; rr(g, 8, 8, w - 16, h - 16, 30); g.stroke();
    const c = open ? '#45ff95' : '#ff5252';
    g.strokeStyle = c; g.lineWidth = 6; g.shadowColor = c; g.shadowBlur = 20; rr(g, 30, 30, w - 60, h - 60, 20); g.stroke();
    const word = open ? 'OPEN' : 'CLOSED'; let size = 130; g.font = `700 ${size}px ${SIGN_FONT}`;
    while (g.measureText(word).width > w - 120 && size > 40) { size -= 4; g.font = `700 ${size}px ${SIGN_FONT}`; }
    g.fillStyle = c; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2 - 12);
    g.shadowBlur = 0; g.fillStyle = '#f2c14e'; g.font = `600 30px ${SIGN_FONT}`; g.fillText('9AM – 6PM', w / 2, h - 52);
  }, 8);
}

export function HQ({ position, lite, open }: { position: V3; lite: boolean; open: boolean }) {
  const mix = useContext(NightCtx);
  const tex = useMemo(() => ({
    atrium: atriumTexture(), garage: wingTexture('garage'), lounge: wingTexture('lounge'), wood: woodTexture(), stone: stoneTexture(),
    letters: lettersTexture(), openT: doorSignTexture(true), closedT: doorSignTexture(false),
    halo: new THREE.CanvasTexture(radialTexture([[0, 'rgba(255,236,180,1)'], [.4, 'rgba(255,200,110,.45)'], [1, 'rgba(255,190,90,0)']])),
  }), []);
  tex.wood.repeat.set(9.4, 1.3);
  const m = useMemo(() => {
    const lit = (map: THREE.Texture, rough: number, metal: number) => new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .3, roughness: rough, metalness: metal, envMapIntensity: 1.25 });
    return {
      atrium: new THREE.MeshPhysicalMaterial({ map: tex.atrium, emissiveMap: tex.atrium, emissive: '#ffffff', emissiveIntensity: .3, roughness: .1, metalness: .25, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 }),
      garage: lit(tex.garage, .3, .2), lounge: lit(tex.lounge, .3, .2),
      wood: new THREE.MeshStandardMaterial({ map: tex.wood, emissiveMap: tex.wood, emissive: '#ff9b4a', emissiveIntensity: 0, roughness: .62, metalness: .02 }),
      stone: new THREE.MeshStandardMaterial({ map: tex.stone, roughness: .85 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1c1a19', roughness: .42, metalness: .5 }),
      roof: new THREE.MeshStandardMaterial({ color: '#3a3f48', roughness: .36, metalness: .7 }),
      gold: new THREE.MeshStandardMaterial({ color: palette.goldBright, metalness: .9, roughness: .26, emissive: '#e0a83a', emissiveIntensity: .35, envMapIntensity: 1.5 }),
      warm: new THREE.MeshStandardMaterial({ color: '#fff2d2', emissive: '#ffc77a', emissiveIntensity: 1.4 }),
      pane: new THREE.MeshPhysicalMaterial({ color: '#b9d3ea', roughness: .05, metalness: 0, transparent: true, opacity: .22, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false }),
      inner: new THREE.MeshStandardMaterial({ color: '#ffd9a6', emissive: '#ffbd6e', emissiveIntensity: .9, side: THREE.BackSide }),
      plant: new THREE.MeshStandardMaterial({ color: '#2f6a30', roughness: .8 }),
      letters: new THREE.MeshBasicMaterial({ map: tex.letters, transparent: true, toneMapped: false, depthWrite: false }),
      halo: new THREE.SpriteMaterial({ map: tex.halo, transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
      beacon: new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff2a1a', emissiveIntensity: 1 }),
    };
  }, [tex]);
  const star = useStarGeometry(.46, .16);
  const beaconLight = useRef<THREE.PointLight>(null), doorLight = useRef<THREE.PointLight>(null), signHalo = useRef<THREE.Sprite>(null);
  const rings = useRef<THREE.Group>(null);
  const hueOpen = useMemo(() => new THREE.Color('#45ff95'), []), hueClosed = useMemo(() => new THREE.Color('#ff5252'), []);
  useFrame(({ clock }) => {
    const n = mix.current, t = clock.elapsedTime;
    m.atrium.emissiveIntensity = .3 + .62 * n; m.garage.emissiveIntensity = .32 + .6 * n; m.lounge.emissiveIntensity = .32 + .6 * n;
    m.wood.emissiveIntensity = .03 + .34 * n; m.gold.emissiveIntensity = .3 + .55 * n; m.warm.emissiveIntensity = 1.2 + 2.3 * n; m.inner.emissiveIntensity = .7 + .55 * n;
    m.halo.opacity = .22 + .5 * n; m.beacon.emissiveIntensity = Math.sin(t * 2.4) > 0 ? 2.2 : .2;
    if (rings.current) rings.current.rotation.y = t * .1;
    if (beaconLight.current) beaconLight.current.intensity = .5 + 8 * n;
    if (doorLight.current) doorLight.current.intensity = .8 + 4.2 * n;
    if (signHalo.current) { const sm = signHalo.current.material as THREE.SpriteMaterial; sm.color.copy(open ? hueOpen : hueClosed); sm.opacity = (.32 + .4 * n) * (.85 + .15 * Math.sin(t * 3)); }
  });
  const signY = 9.0;
  return <group position={position}>
    {/* plinth and body */}
    <Box p={[0, .15, 0]} s={[46, .3, 9.4]} c="#1b1918" r={.6} />
    <Box p={[0, CB.top / 2, 0]} s={[CB.hw * 2, CB.top, CB.hd * 2]} c="#2a2622" r={.7} />
    {/* limestone piers */}
    {[-1, 1].map(s => <mesh key={s} position={[s * (GL.hw + (CB.hw - GL.hw) / 2), CB.top / 2, CB.hd + .14]} material={m.stone} castShadow receiveShadow><boxGeometry args={[CB.hw - GL.hw, CB.top, .56]} /></mesh>)}
    {/* glass atrium */}
    <mesh position={[0, GL.y0 + GL.h / 2, CB.hd + .05]} material={m.atrium}><planeGeometry args={[GL.hw * 2, GL.h]} /></mesh>
    <Box p={[0, GL.y0 + GL.h + .32, CB.hd + .2]} s={[GL.hw * 2 + .2, .64, .4]} c="#15130f" r={.4} m={.5} cast={false} />
    {/* cedar sign band, letters and stars */}
    <mesh position={[0, 8.1 + 1.25 + .32, CB.hd + .06]} material={m.wood}><planeGeometry args={[GL.hw * 2, 2.5]} /></mesh>
    <mesh position={[0, signY, CB.hd + .1]} material={m.letters}><planeGeometry args={[11.2, 1.4]} /></mesh>
    <sprite position={[0, signY, CB.hd + .3]} scale={[13, 3.4, 1]} material={m.halo} />
    {[-2.4, -1.2, 0, 1.2, 2.4].map(x => <mesh key={x} position={[x, 10.05, CB.hd + .14]} geometry={star} material={m.gold} />)}
    <Box p={[0, CB.top - .12, 0]} s={[CB.hw * 2 + .8, .3, CB.hd * 2 + .8]} c="#15130f" r={.4} m={.5} cast={false} />
    {/* entrance canopy, light strip, sconces */}
    <Box p={[0, 3.62, CB.hd + 1.0]} s={[8.2, .22, 2.0]} c="#15130f" r={.35} m={.5} />
    <mesh position={[0, 3.49, CB.hd + 1.0]} material={m.warm}><boxGeometry args={[7.6, .04, 1.5]} /></mesh>
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[s * 8.5, 3.6, CB.hd + .5]} material={m.warm}><boxGeometry args={[.16, .7, .1]} /></mesh>
      <sprite position={[s * 8.5, 3.6, CB.hd + .75]} scale={[2.4, 2.4, 1]} material={m.halo} />
    </group>)}
    {/* the door sign: open 9am to 6pm Georgia time, closed otherwise */}
    <mesh position={[0, 2.55, CB.hd + .12]}><planeGeometry args={[1.9, .95]} /><meshBasicMaterial map={open ? tex.openT : tex.closedT} transparent toneMapped={false} /></mesh>
    <sprite ref={signHalo} position={[0, 2.55, CB.hd + .2]} scale={[3.6, 2.2, 1]} material={new THREE.SpriteMaterial({ map: tex.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })} />
    {/* wings */}
    {[-1, 1].map(s => {
      const cx = s * (WING.x0 + WING.w / 2), cz = (WING.front + WING.back) / 2, d = WING.front - WING.back;
      return <group key={s}>
        <Box p={[cx, WING.h / 2, cz]} s={[WING.w, WING.h, d]} c="#26262b" r={.6} />
        <mesh position={[cx, WING.h / 2, WING.front + .03]} material={s < 0 ? m.garage : m.lounge}><planeGeometry args={[WING.w, WING.h]} /></mesh>
        <Box p={[cx, WING.h + .14, cz + .2]} s={[WING.w + .5, .32, d + .8]} c="#15130f" r={.4} m={.5} cast={false} />
        <mesh position={[cx, 4.0, WING.front + .75]} material={m.dark}><boxGeometry args={[WING.w - .4, .16, 1.5]} /></mesh>
      </group>;
    })}
    {/* lantern tower */}
    <mesh position={[0, CB.top + .55, -.8]} material={m.wood} castShadow><boxGeometry args={[8.2, 1.0, 6.4]} /></mesh>
    <mesh position={[0, CB.top + 1.05 + 1.85, -.8]} material={m.inner}><boxGeometry args={[7.4, 3.7, 5.6]} /></mesh>
    <group ref={rings} position={[0, CB.top + 2.9, -.8]}>
      {[-.6, 1.0].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={m.warm}><torusGeometry args={[2.0, .035, 8, 48]} /></mesh>)}
      {[[-2.6, -1.4], [2.6, -1.2], [-2.4, 1.4], [2.5, 1.5]].map(([x, z], i) => <mesh key={i} position={[x, -1.1, z]} material={m.plant}><sphereGeometry args={[.55, 10, 8]} /></mesh>)}
    </group>
    <mesh position={[0, CB.top + 2.9, -.8]} material={m.pane}><boxGeometry args={[7.6, 3.7, 5.8]} /></mesh>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 3.8, CB.top + 2.9, -.8 + sz * 2.9]} material={m.dark}><boxGeometry args={[.14, 3.8, .14]} /></mesh>))}
    {[-1.9, 1.9].map(x => <mesh key={x} position={[x, CB.top + 2.9, -.8 + 2.9]} material={m.dark}><boxGeometry args={[.08, 3.7, .1]} /></mesh>)}
    <mesh position={[0, CB.top + 4.78, -.8]} material={m.dark}><boxGeometry args={[7.8, .18, 6.0]} /></mesh>
    <mesh position={[0, CB.top + 4.87 + 1.0, -.8]} rotation-y={Math.PI / 4} scale={[9.4 / 1.4142, 2.0, 7.6 / 1.4142]} material={m.roof} castShadow><coneGeometry args={[1, 1, 4]} /></mesh>
    <mesh position={[0, CB.top + 7.9, -.8]} material={m.dark}><cylinderGeometry args={[.03, .06, 2.6, 8]} /></mesh>
    <mesh position={[0, CB.top + 9.25, -.8]} material={m.beacon}><sphereGeometry args={[.11, 10, 8]} /></mesh>
    <sprite position={[0, CB.top + 3.0, -.8 + 3.2]} scale={[11, 6, 1]} material={m.halo} />
    <pointLight ref={beaconLight} position={[0, CB.top + 3, 1.6]} color="#ffd9a0" distance={34} decay={1.6} intensity={.5} />
    {!lite && <pointLight ref={doorLight} position={[0, 3.0, CB.hd + 3]} color="#ffc98f" distance={16} decay={1.7} intensity={.8} />}
  </group>;
}
