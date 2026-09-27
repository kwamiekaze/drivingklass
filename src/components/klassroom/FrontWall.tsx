import { DISPLAY, SERIF, goldGradient, roundedRect, setTracking, star, useCanvasTexture } from "./shared";

/**
 * The fourth wall, so a full 360 turn finds a finished room: lacquered double
 * doors with gold hardware, an illuminated KLASSROOM transom, the DrivingKlass
 * wordmark and two framed brand prints. Painted on one inward-facing plane, so
 * it is invisible from the opening shot outside the room and solid from inside.
 */

const TEX_W = 4096;
const TEX_H = 1229; // 12m x 3.6m

function frame(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  c.fillStyle = goldGradient(c, y, y + h);
  c.fillRect(x - 14, y - 14, w + 28, h + 28);
  c.fillStyle = "#141210";
  c.fillRect(x, y, w, h);
}

function paint(c: CanvasRenderingContext2D, w: number, h: number) {
  const px = w / 12; // pixels per metre
  const yOf = (m: number) => h - m * px;

  // ivory plaster with a soft top-down light falloff
  const wall = c.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#e8d0a8");
  wall.addColorStop(1, "#efdbb9");
  c.fillStyle = wall;
  c.fillRect(0, 0, w, h);

  // gold cornice
  c.fillStyle = goldGradient(c, 0, 22);
  c.fillRect(0, 0, w, 20);

  // black wainscot with inset panels and a gold chair rail (0 to 0.9 m)
  c.fillStyle = "#161311";
  c.fillRect(0, yOf(0.9), w, 0.9 * px);
  const panels = 13;
  const pw = w / panels;
  for (let i = 0; i < panels; i += 1) {
    c.fillStyle = "#1e1a17";
    c.fillRect(i * pw + 24, yOf(0.75), pw - 48, 0.56 * px);
  }
  c.fillStyle = goldGradient(c, yOf(0.92), yOf(0.88));
  c.fillRect(0, yOf(0.92), w, 0.035 * px);
  c.fillStyle = "#0f0d0c";
  c.fillRect(0, yOf(0.12), w, 0.12 * px);

  // double doors, centred (2.0 m wide, 2.2 m tall)
  const cx = w / 2;
  const dw = 2.0 * px;
  const dh = 2.2 * px;
  const dx = cx - dw / 2;
  const dy = yOf(2.2);
  c.fillStyle = goldGradient(c, dy - 40, dy);
  c.fillRect(dx - 40, dy - 40, dw + 80, dh + 40);
  c.fillStyle = "#121010";
  c.fillRect(dx, dy, dw, dh);
  for (const side of [0, 1]) {
    const lx = dx + side * (dw / 2);
    const lw = dw / 2;
    c.strokeStyle = "rgba(201,162,74,0.5)";
    c.lineWidth = 4;
    c.strokeRect(lx + 40, dy + 40, lw - 80, dh * 0.42);
    c.strokeRect(lx + 40, dy + dh * 0.5, lw - 80, dh * 0.44);
    // tall gold pull handles
    const hx = side === 0 ? lx + lw - 46 : lx + 34;
    c.fillStyle = goldGradient(c, dy + dh * 0.36, dy + dh * 0.62);
    roundedRect(c, hx, dy + dh * 0.36, 12, dh * 0.26, 6);
    c.fill();
  }
  c.fillStyle = "#050404";
  c.fillRect(cx - 3, dy, 6, dh);

  // illuminated transom over the doors
  const ty = dy - 40 - 0.3 * px;
  const glow = c.createLinearGradient(0, ty, 0, ty + 0.3 * px);
  glow.addColorStop(0, "#fff4d6");
  glow.addColorStop(1, "#f3dc9e");
  c.fillStyle = "#141210";
  c.fillRect(dx - 40, ty - 12, dw + 80, 0.26 * px + 24);
  c.fillStyle = glow;
  c.fillRect(dx - 24, ty, dw + 48, 0.26 * px);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `800 64px ${DISPLAY}`;
  setTracking(c, "30px");
  c.fillStyle = "#141210";
  c.fillText("KLASSROOM", cx + 15, ty + 0.13 * px + 4);
  setTracking(c, "0px");

  // wordmark and slogan above
  c.font = `800 118px ${DISPLAY}`;
  setTracking(c, "36px");
  c.fillStyle = goldGradient(c, 90, 210);
  c.fillText("DRIVING KLASS", cx + 18, 118);
  setTracking(c, "0px");
  c.font = `italic 600 58px ${SERIF}`;
  c.fillStyle = "#3a2f22";
  c.fillText("Where 5-Star Drivers Are Made", cx, 200);
  for (let i = 0; i < 5; i += 1) {
    star(c, cx - 120 + i * 60, 258, 20);
    c.fillStyle = goldGradient(c, 238, 278);
    c.fill();
  }

  // two framed prints either side
  const prints: Array<{ x: number; title: string; sub: string }> = [
    { x: w * 0.23, title: "Road Test Ready", sub: "Warm-up · Dual-pedal car · Insured" },
    { x: w * 0.77, title: "5-Star Instructors", sub: "Calm. Patient. Certified." },
  ];
  for (const p of prints) {
    const fw = 1.7 * px;
    const fh = 1.15 * px;
    const fx = p.x - fw / 2;
    const fy = yOf(2.75);
    frame(c, fx, fy, fw, fh);
    const inner = c.createLinearGradient(fx, fy, fx, fy + fh);
    inner.addColorStop(0, "#1c1814");
    inner.addColorStop(1, "#2b2217");
    c.fillStyle = inner;
    c.fillRect(fx + 30, fy + 30, fw - 60, fh - 60);
    // stylised road vanishing to a gold sun
    c.fillStyle = "rgba(240,213,138,0.9)";
    c.beginPath();
    c.arc(p.x, fy + fh * 0.6, 62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#0e0c0a";
    c.beginPath();
    c.moveTo(fx + 30, fy + fh - 30);
    c.lineTo(p.x - 24, fy + fh * 0.64);
    c.lineTo(p.x + 24, fy + fh * 0.64);
    c.lineTo(fx + fw - 30, fy + fh - 30);
    c.fill();
    c.strokeStyle = "#e8c872";
    c.lineWidth = 8;
    c.setLineDash([36, 30]);
    c.beginPath();
    c.moveTo(p.x, fy + fh * 0.67);
    c.lineTo(p.x, fy + fh - 34);
    c.stroke();
    c.setLineDash([]);
    c.font = `italic 700 72px ${SERIF}`;
    c.fillStyle = goldGradient(c, fy + 60, fy + 140);
    c.fillText(p.title, p.x, fy + 104);
    c.font = `600 34px ${DISPLAY}`;
    c.fillStyle = "rgba(247,236,208,0.8)";
    c.fillText(p.sub, p.x, fy + 170);
  }

  c.textAlign = "left";
}

export function FrontWall() {
  const [tex] = useCanvasTexture(TEX_W, TEX_H, paint);
  return (
    <group>
      <mesh position={[0, 1.8, 5.2]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[12, 3.6]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {/* light spilling from the transom */}
      <pointLight position={[0, 2.6, 4.7]} intensity={0.6} distance={3} color="#ffe6b0" />
    </group>
  );
}
