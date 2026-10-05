import { useEffect, useRef } from "react";

/*
 * The footer drive for laptops and desktops: a first-person night or sunset drive down a tree-lined road, drawn live and looping
 * forever. It is the same scene as the two films phones play: a backlit avenue of trees closing in on a low sun (or a dark road
 * with street lamps and the odd pair of oncoming headlights), a double yellow line, a white edge line and the DrivingKlass
 * steering wheel with its five gold stars. Canvas 2D, about 40 sprites a frame, paused when off screen or the tab is hidden.
 */
type Pal = { sky: string[]; glow: string; glowA: number; road: [string, string]; grass: string; fog: [number, number, number]; tree: [string, string, string]; rim: string; lamp: boolean };
const DAY: Pal = { sky: ["#f6ecd2", "#f9dc9c", "#f3b04a"], glow: "255,214,120", glowA: .95, road: ["#7a6d62", "#2b2926"], grass: "#4b5e2a", fog: [244, 196, 110], tree: ["#2e4a1c", "#1f3813", "#142609"], rim: "255,206,96", lamp: false };
const NIGHT: Pal = { sky: ["#02040c", "#07102a", "#1a1c3a"], glow: "255,176,90", glowA: .16, road: ["#25262e", "#0a0a0f"], grass: "#0c1408", fog: [14, 16, 34], tree: ["#101c12", "#0a130b", "#060b07"], rim: "170,120,50", lamp: true };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function treeSprite(p: Pal, seed: number) {
  const c = document.createElement("canvas"); c.width = 280; c.height = 400; const g = c.getContext("2d")!;
  g.fillStyle = p.lamp ? "#0a0806" : "#2a2218"; g.fillRect(134, 240, 12, 160);
  // a tall, layered crown: many small leaf masses stacked from the top down, lit on the side facing the sun
  const blobs = Array.from({ length: 20 }, (_, i) => ({ x: 140 + Math.sin(seed * 7 + i * 2.3) * (48 - i * .8), y: 52 + i * 11.2 + Math.cos(seed * 5 + i * 1.9) * 16, r: 30 + ((seed * 13 + i * 17) % 18) + (i > 5 && i < 15 ? 8 : 0) }));
  blobs.forEach(b => {
    const gr = g.createRadialGradient(b.x - b.r * .25, b.y - b.r * .2, b.r * .1, b.x, b.y, b.r);
    gr.addColorStop(0, p.tree[0]); gr.addColorStop(.7, p.tree[1]); gr.addColorStop(1, p.tree[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
  });
  blobs.forEach(b => {   // golden light along the edge facing the sun, blurred so no ring shows
    const rim = g.createRadialGradient(b.x + b.r * .55, b.y - b.r * .1, 0, b.x + b.r * .55, b.y - b.r * .1, b.r * .9);
    rim.addColorStop(0, `rgba(${p.rim},${p.lamp ? .16 : .32})`); rim.addColorStop(1, `rgba(${p.rim},0)`);
    g.fillStyle = rim; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
  });
  for (let i = 0; i < 220; i++) { const a = Math.random() * 6.28, d = Math.random() * 110; g.fillStyle = `rgba(${p.rim},${p.lamp ? .07 : .2})`; g.fillRect(140 + Math.cos(a) * d * .65, 160 + Math.sin(a) * d * 1.45, 2, 2); }
  return c;
}

function wheelArt(w: number, h: number, night: boolean) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!;
  const cx = w / 2, R = Math.min(w * .46, h * .98), cy = h * .62;
  // gold bonnet strip and the dark dash
  const bon = g.createLinearGradient(0, 0, 0, h * .16); bon.addColorStop(0, night ? "#6b4d12" : "#e0b23c"); bon.addColorStop(1, night ? "#2a1d06" : "#8a6516");
  g.fillStyle = "#07080c"; g.fillRect(0, 0, w, h); g.fillStyle = bon; g.fillRect(0, 0, w, h * .075);
  const dash = g.createLinearGradient(0, h * .07, 0, h); dash.addColorStop(0, night ? "#14110e" : "#241d16"); dash.addColorStop(1, "#050507"); g.fillStyle = dash; g.fillRect(0, h * .075, w, h);
  // instrument cluster
  g.strokeStyle = "rgba(210,214,222,.75)"; g.lineWidth = 4; g.fillStyle = "#06070b"; g.beginPath(); g.ellipse(cx, h * .3, R * .62, h * .13, 0, 0, 7); g.fill(); g.stroke();
  // wheel ring
  const ring = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); ring.addColorStop(0, "#2a2a2e"); ring.addColorStop(.5, "#0c0c0f"); ring.addColorStop(1, "#1c1c20");
  g.strokeStyle = ring; g.lineWidth = R * .13; g.beginPath(); g.arc(cx, cy, R * .93, 0, 7); g.stroke();
  g.strokeStyle = "rgba(255,255,255,.1)"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * .985, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
  // chrome spokes
  const sp = g.createLinearGradient(cx - R, cy, cx + R, cy); sp.addColorStop(0, "#6c7076"); sp.addColorStop(.3, "#e8eaee"); sp.addColorStop(.5, "#9ea3aa"); sp.addColorStop(.7, "#eceef2"); sp.addColorStop(1, "#6c7076");
  g.fillStyle = sp; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(cx + s * R * .27, cy - R * .2); g.lineTo(cx + s * R * .8, cy - R * .08); g.lineTo(cx + s * R * .86, cy + R * .2); g.lineTo(cx + s * R * .62, cy + R * .6); g.lineTo(cx + s * R * .3, cy + R * .5); g.closePath(); g.fill(); });
  // hub
  const hub = g.createRadialGradient(cx - R * .1, cy - R * .2, R * .05, cx, cy, R * .5); hub.addColorStop(0, "#26262b"); hub.addColorStop(1, "#08080a");
  g.fillStyle = hub; g.beginPath(); g.ellipse(cx, cy, R * .38, R * .4, 0, 0, 7); g.fill();
  // the hub is left plain: the DrivingKlass wheel emblem of the page's end cap sits on it
  // thumb buttons
  g.fillStyle = "#0d0e12"; [-1, 1].forEach(s => { g.beginPath(); g.roundRect(cx + s * R * .6 - R * .09, cy - R * .02, R * .18, R * .16, 8); g.fill(); [0, 1, 2].forEach(i => { g.fillStyle = "#1b1c22"; g.fillRect(cx + s * R * .5 - R * .07 + i * R * .06, cy + R * .3, R * .045, R * .1); }); g.fillStyle = "#0d0e12"; });
  return c;
}

export function FooterDrive({ night, paused, still }: { night: boolean; paused: boolean; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ paused, still });
  live.current = { paused, still };
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d"); if (!ctx) return;
    const P = night ? NIGHT : DAY;
    let W = 0, H = 0, wheel: HTMLCanvasElement | null = null, raf = 0, last = 0, time = 0;
    const sprites = [0, 1, 2, 3].map(i => treeSprite(P, i + 1));
    type Tree = { side: number; x: number; z: number; s: number; v: number; flip: boolean };
    const mk = (side: number, z: number): Tree => ({ side, x: side * rnd(7.5, 17), z, s: rnd(.8, 1.35), v: Math.floor(rnd(0, 4)), flip: Math.random() > .5 });
    const trees: Tree[] = []; for (let i = 0; i < 26; i++) { trees.push(mk(-1, 6 + i * 8.6 + rnd(0, 4))); trees.push(mk(1, 8 + i * 8.6 + rnd(0, 4))); }
    const car = { z: 400, t: rnd(2, 6) };
    const resize = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(1.25, window.devicePixelRatio || 1); W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr)); cv.width = W; cv.height = H; wheel = wheelArt(W, Math.round(H * .34), night); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(cv);
    const FAR = 230, NEAR = 11;

    const draw = (dt: number) => {
      time += dt; const f = W * .66, vpx = W * .48 + Math.sin(time * .21) * W * .006, hy = H * .5 + Math.sin(time * 2.9) * 1.1, camH = 1.25, speed = 15;
      const px = (X: number, z: number) => vpx + (X * f) / z, py = (z: number) => hy + (camH * f) / z;
      // sky and the low sun
      const sk = ctx.createLinearGradient(0, 0, 0, hy); P.sky.forEach((c, i) => sk.addColorStop(i / (P.sky.length - 1), c)); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, hy + 2);
      const gl = ctx.createRadialGradient(vpx, hy, 0, vpx, hy, H * .62); gl.addColorStop(0, `rgba(${P.glow},${P.glowA})`); gl.addColorStop(.35, `rgba(${P.glow},${P.glowA * .4})`); gl.addColorStop(1, `rgba(${P.glow},0)`); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, hy + 2);
      // ground, road and verge
      ctx.fillStyle = P.grass; ctx.fillRect(0, hy, W, H - hy);
      const road = ctx.createLinearGradient(0, hy, 0, H); road.addColorStop(0, P.road[0]); road.addColorStop(1, P.road[1]);
      const quad = (x0: number, x1: number, z0: number, z1: number, fill: string | CanvasGradient) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(px(x0, z1), py(z1)); ctx.lineTo(px(x1, z1), py(z1)); ctx.lineTo(px(x1, z0), py(z0)); ctx.lineTo(px(x0, z0), py(z0)); ctx.closePath(); ctx.fill(); };
      quad(-6, 3.5, 1.6, FAR, road);
      quad(3.5, 4.3, 1.6, FAR, night ? "#1a1b20" : "#8d867a");              // kerb
      quad(4.3, 6.2, 1.6, FAR, night ? "#101611" : "#6f7a45");              // verge
      // sun glare lying on the road, or the glow of the lamps
      const glare = ctx.createRadialGradient(vpx, hy + H * .06, 0, vpx, hy + H * .06, H * .5); glare.addColorStop(0, `rgba(${P.glow},${night ? .12 : .5})`); glare.addColorStop(1, `rgba(${P.glow},0)`); ctx.fillStyle = glare; ctx.fillRect(0, hy, W, H - hy);
      // lines: white edge, double yellow in dashes that flow toward you
      quad(2.45, 2.62, 1.6, FAR, night ? "rgba(220,220,225,.8)" : "rgba(250,248,240,.92)");
      const off = (time * speed) % 11;
      for (let k = -1; k < 24; k++) { const z0 = Math.max(1.6, k * 11 - off), z1 = Math.max(1.6, k * 11 + 4.6 - off); if (z1 <= z0 + .05 || z0 > FAR) continue; [-2.1, -1.88].forEach(x => quad(x - .07, x + .07, z0, z1, night ? "rgba(235,184,50,.85)" : "rgba(245,190,40,.95)")); }
      // street lamps (night) and trees, far to near
      const items: { z: number; fn: () => void }[] = [];
      trees.forEach(t => { t.z -= speed * dt; if (t.z < NEAR) { Object.assign(t, mk(t.side, FAR + rnd(0, 6))); } items.push({ z: t.z, fn: () => {
        const s = f / t.z, sw = 10.1 * s * t.s, sh = 14.5 * s * t.s, x = px(t.x, t.z), y = py(t.z), far = Math.min(1, Math.max(0, (t.z - 40) / (FAR - 40))), near = Math.min(1, Math.max(0, (t.z - NEAR) / 12));
        ctx.save(); ctx.globalAlpha = (1 - far * .8) * near; ctx.translate(x, y); if (t.flip) ctx.scale(-1, 1); ctx.drawImage(sprites[t.v]!, -sw / 2, -sh * .98, sw, sh); ctx.restore();
      } }); });
      if (P.lamp) for (let k = 0; k < 9; k++) [-1, 1].forEach(side => { const z = ((k * 26 - (time * speed) % 26) + 260) % 234 + 4; items.push({ z, fn: () => {
        const X = side * 4.6, x = px(X, z), y = py(z), s = f / z, h = 5.4 * s;
        ctx.strokeStyle = "rgba(10,8,6,.9)"; ctx.lineWidth = Math.max(1, .1 * s); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
        const r = Math.max(2, .42 * s), gg = ctx.createRadialGradient(x, y - h, 0, x, y - h, r * 5); gg.addColorStop(0, "rgba(255,214,140,.95)"); gg.addColorStop(.25, "rgba(255,170,70,.45)"); gg.addColorStop(1, "rgba(255,150,40,0)"); ctx.fillStyle = gg; ctx.fillRect(x - r * 5, y - h - r * 5, r * 10, r * 10);
        const pool = ctx.createRadialGradient(px(X - side * 1.2, z), y, 0, px(X - side * 1.2, z), y, r * 7); pool.addColorStop(0, "rgba(255,170,70,.22)"); pool.addColorStop(1, "rgba(255,170,70,0)"); ctx.fillStyle = pool; ctx.fillRect(px(X - side * 1.2, z) - r * 7, y - r * 3, r * 14, r * 6);
      } }); });
      items.sort((a, b) => b.z - a.z).forEach(i => i.fn());
      // oncoming headlights (night)
      if (night) { car.t -= dt; if (car.z > NEAR && car.t <= 0) { car.z -= (speed + 28) * dt; } if (car.t <= 0 && car.z <= NEAR) { car.z = 230; car.t = rnd(9, 15); }
        if (car.t <= 0 && car.z < 230) { const z = Math.max(NEAR, car.z), s = f / z, y = py(z) - .62 * s, r = Math.max(3, .22 * s);
          [-1, 1].forEach(sd => { const x = px(-3.95 + sd * .72, z), gg = ctx.createRadialGradient(x, y, 0, x, y, r * 7); gg.addColorStop(0, "rgba(255,255,248,1)"); gg.addColorStop(.18, "rgba(255,244,214,.75)"); gg.addColorStop(1, "rgba(255,230,180,0)"); ctx.fillStyle = gg; ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14); });
          const sx = px(-3.95, z), st = ctx.createLinearGradient(0, y, 0, H); st.addColorStop(0, "rgba(255,240,200,.24)"); st.addColorStop(1, "rgba(255,240,200,0)"); ctx.fillStyle = st; ctx.fillRect(sx - r * 3, y, r * 6, H - y); }
      } else if (night) { /* keep the pair quiet while waiting */ }
      // haze along the horizon, then the cab
      const hz = ctx.createLinearGradient(0, hy - H * .1, 0, hy + H * .05); hz.addColorStop(0, `rgba(${P.fog},0)`); hz.addColorStop(.6, `rgba(${P.fog},${night ? .35 : .55})`); hz.addColorStop(1, `rgba(${P.fog},0)`); ctx.fillStyle = hz; ctx.fillRect(0, hy - H * .1, W, H * .15);
      if (wheel) { const wh = wheel.height, top = H * .54, ang = Math.sin(time * .23) * .018; ctx.fillStyle = '#050507'; ctx.fillRect(0, top + wh * .9, W, H - top - wh * .9); ctx.save(); ctx.translate(W / 2, top + wh * .55); ctx.rotate(ang); ctx.drawImage(wheel, -W / 2, -wh * .55, W, wh); ctx.restore(); }
    };
    const loop = (ts: number) => { raf = requestAnimationFrame(loop); const dt = Math.min(.05, (ts - last) / 1000 || .016); if (ts - last < 28) return; last = ts; if (live.current.paused || document.hidden) return; draw(dt); };
    if (live.current.still) { draw(0.016); } else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [night]);
  return <canvas ref={ref} className="n2-cbd-drive" />;
}
