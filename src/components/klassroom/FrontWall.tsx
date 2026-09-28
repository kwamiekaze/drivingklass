import { SignPanel } from "./Decor";
import { DISPLAY, LOW_POWER, SERIF, goldGradient, roundedRect, setTracking, star, useCanvasTexture } from "./shared";

/**
 * The fourth wall, so a full 360 turn finds a finished room: lacquered double
 * doors with gold hardware, an illuminated KLASSROOM transom, the DrivingKlass
 * wordmark and two framed displays of road signs. Painted on one inward-facing plane, so
 * it is invisible from the opening shot outside the room and solid from inside.
 */

const TEX_W = LOW_POWER ? 2048 : 4096;
const TEX_H = LOW_POWER ? 614 : 1229; // 12m x 3.6m

function paint(c: CanvasRenderingContext2D, realW: number, realH: number) {
  // Laid out at 4096 wide and scaled, so the lighter phone texture matches.
  c.save();
  c.scale(realW / 4096, realH / 1229);
  const w = 4096;
  const h = 1229;
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

  c.textAlign = "left";
  c.restore();
}

export function FrontWall() {
  const [tex] = useCanvasTexture(TEX_W, TEX_H, paint);
  return (
    <group>
      <mesh position={[0, 1.8, 5.2]} rotation-y={Math.PI} receiveShadow>
        <planeGeometry args={[12, 3.6]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {/* road sign displays either side of the doors, facing into the room */}
      <SignPanel
        kinds={["donotenter", "oneway", "nouturn"]}
        position={[-3.3, 2.05, 5.17]}
        rotationY={Math.PI}
        width={2.4}
      />
      <SignPanel
        kinds={["merge", "pedestrian", "speed55"]}
        position={[3.3, 2.05, 5.17]}
        rotationY={Math.PI}
        width={2.4}
      />
      {/* light spilling from the transom */}
      {!LOW_POWER && <pointLight position={[0, 2.6, 4.7]} intensity={0.6} distance={3} color="#ffe6b0" />}
    </group>
  );
}
