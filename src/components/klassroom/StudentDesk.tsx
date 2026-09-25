import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { DISPLAY, SERIF, brushedGold, goldGradient, goldProps, star } from "./shared";

/**
 * A student station: walnut desktop on black sled legs with gold feet, a
 * moulded chair, and a rotating cast of study props (the driver's manual, an
 * open notebook with a road sketch, a gold pencil, a learner's permit, a
 * little traffic cone) so no two desks look copy-pasted.
 */

const DESK_W = 1.25;
const DESK_D = 0.62;
const DESK_H = 0.74;
const WALNUT = "#6b4428";
const STEEL = "#1b1917";

let manualTex: CanvasTexture | null = null;
let notebookTex: CanvasTexture | null = null;
let permitTex: CanvasTexture | null = null;

function makeTexture(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  paint(c);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  document.fonts?.ready.then(() => {
    paint(c);
    t.needsUpdate = true;
  });
  return t;
}

function useDeskTextures() {
  return useMemo(() => {
    manualTex ??= makeTexture(512, 680, (c) => {
      c.fillStyle = "#141210";
      c.fillRect(0, 0, 512, 680);
      c.strokeStyle = "#c9a24a";
      c.lineWidth = 6;
      c.strokeRect(22, 22, 468, 636);
      c.textAlign = "center";
      c.font = `700 30px ${DISPLAY}`;
      c.fillStyle = "#e8c872";
      c.fillText("GEORGIA", 256, 130);
      c.font = `800 58px ${SERIF}`;
      c.fillStyle = goldGradient(c, 180, 330);
      c.fillText("Driver's", 256, 230);
      c.fillText("Manual", 256, 300);
      for (let i = 0; i < 5; i += 1) {
        star(c, 176 + i * 40, 380, 14);
        c.fillStyle = "#c9a24a";
        c.fill();
      }
      c.font = `600 24px ${DISPLAY}`;
      c.fillStyle = "#e8c872";
      c.fillText("DRIVING KLASS EDITION", 256, 600);
    });
    notebookTex ??= makeTexture(1024, 640, (c) => {
      c.fillStyle = "#fbf8ef";
      c.fillRect(0, 0, 1024, 640);
      c.fillStyle = "#e7e1d1";
      c.fillRect(506, 0, 12, 640);
      c.strokeStyle = "rgba(90,130,190,0.35)";
      c.lineWidth = 2;
      for (let y = 70; y < 640; y += 38) {
        c.beginPath();
        c.moveTo(20, y);
        c.lineTo(1004, y);
        c.stroke();
      }
      c.strokeStyle = "rgba(210,90,90,0.4)";
      c.beginPath();
      c.moveTo(80, 0);
      c.lineTo(80, 640);
      c.stroke();
      c.font = `500 34px "Caveat", "Segoe Print", cursive`;
      c.fillStyle = "#2a3550";
      const notes = ["Mirror, signal, shoulder", "Full stop = 3 seconds", "Hands 9 & 3", "Scan 12 sec ahead"];
      notes.forEach((n, i) => c.fillText(n, 96, 102 + i * 76));
      // road sketch on the right page
      c.strokeStyle = "#2a3550";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(600, 560);
      c.bezierCurveTo(700, 380, 860, 420, 960, 120);
      c.moveTo(680, 580);
      c.bezierCurveTo(780, 420, 920, 460, 1010, 170);
      c.stroke();
      c.setLineDash([16, 14]);
      c.beginPath();
      c.moveTo(640, 570);
      c.bezierCurveTo(740, 400, 890, 440, 985, 145);
      c.stroke();
      c.setLineDash([]);
      star(c, 900, 520, 36);
      c.strokeStyle = "#c9a24a";
      c.stroke();
    });
    permitTex ??= makeTexture(512, 320, (c) => {
      const g = c.createLinearGradient(0, 0, 512, 320);
      g.addColorStop(0, "#f3ecdc");
      g.addColorStop(1, "#e2d3ad");
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 320);
      c.fillStyle = "#141210";
      c.fillRect(0, 0, 512, 64);
      c.font = `800 30px ${DISPLAY}`;
      c.fillStyle = "#e8c872";
      c.fillText("LEARNER'S PERMIT", 24, 44);
      c.fillStyle = "#b9a98a";
      c.fillRect(24, 90, 140, 180);
      c.fillStyle = "#3a332a";
      c.font = `600 24px ${DISPLAY}`;
      c.fillText("CLASS  CP", 190, 124);
      c.fillText("STUDENT DRIVER", 190, 164);
      c.fillText("DRIVING KLASS", 190, 204);
    });
    return { manual: manualTex, notebook: notebookTex, permit: permitTex };
  }, []);
}

function TrafficCone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={0.55}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.16, 0.024, 0.16]} />
        <meshStandardMaterial color="#1a1614" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <coneGeometry args={[0.06, 0.2, 24]} />
        <meshStandardMaterial color="#f36b1c" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.042, 0.047, 0.03, 24, 1, true]} />
        <meshStandardMaterial color="#f7f3ea" roughness={0.3} />
      </mesh>
    </group>
  );
}

function StudentChair() {
  return (
    <group>
      {/* sled frame */}
      {[-0.2, 0.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.012, 0]} castShadow>
            <boxGeometry args={[0.022, 0.024, 0.46]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.23, -0.2]} castShadow>
            <boxGeometry args={[0.022, 0.46, 0.022]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.23, 0.2]} castShadow>
            <boxGeometry args={[0.022, 0.46, 0.022]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.72, 0.22]} castShadow>
            <boxGeometry args={[0.022, 0.5, 0.022]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* seat: walnut shell with a black leather pad */}
      <mesh position={[0, 0.47, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.035, 0.46]} />
        <meshStandardMaterial color={WALNUT} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.5, -0.01]} scale={[0.2, 0.03, 0.19]} castShadow>
        <sphereGeometry args={[1, 24, 12]} />
        <meshStandardMaterial color="#1c1815" roughness={0.55} />
      </mesh>
      {/* curved back */}
      <mesh position={[0, 0.86, -0.1]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.2, 28, 1, true, -0.6, 1.2]} />
        <meshStandardMaterial color={WALNUT} roughness={0.45} side={2} />
      </mesh>
      <mesh position={[0, 0.86, 0.262]} rotation-y={0}>
        <boxGeometry args={[0.08, 0.012, 0.004]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
    </group>
  );
}

export function StudentDesk({
  position,
  variant = 0,
}: {
  position: [number, number, number];
  variant?: number;
}) {
  const tex = useDeskTextures();
  const v = variant % 4;
  return (
    <group position={position}>
      {/* desktop with a gold edge band */}
      <mesh position={[0, DESK_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[DESK_W, 0.045, DESK_D]} />
        <meshStandardMaterial color={WALNUT} roughness={0.42} />
      </mesh>
      <mesh position={[0, DESK_H - 0.004, DESK_D / 2 + 0.002]}>
        <boxGeometry args={[DESK_W, 0.012, 0.004]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      {/* modesty panel */}
      <mesh position={[0, DESK_H - 0.2, -DESK_D / 2 + 0.04]} castShadow>
        <boxGeometry args={[DESK_W - 0.1, 0.34, 0.02]} />
        <meshStandardMaterial color="#1a1715" roughness={0.5} />
      </mesh>
      {/* sled legs */}
      {[-DESK_W / 2 + 0.06, DESK_W / 2 - 0.06].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, DESK_H / 2, -DESK_D / 2 + 0.06]} castShadow>
            <boxGeometry args={[0.03, DESK_H, 0.03]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, DESK_H / 2, DESK_D / 2 - 0.06]} castShadow>
            <boxGeometry args={[0.03, DESK_H, 0.03]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.015, 0]} castShadow>
            <boxGeometry args={[0.03, 0.03, DESK_D - 0.08]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, 0.008, s * (DESK_D / 2 - 0.05)]}>
              <cylinderGeometry args={[0.022, 0.022, 0.016, 14]} />
              <meshStandardMaterial {...goldProps} />
            </mesh>
          ))}
        </group>
      ))}

      {/* props */}
      <group position={[0, DESK_H + 0.023, 0]}>
        {/* driver's manual */}
        <group position={[v % 2 ? 0.38 : -0.38, 0, -0.05]} rotation-y={v % 2 ? -0.25 : 0.2}>
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.24, 0.04, 0.32]} />
            <meshStandardMaterial color="#efe6d0" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.0405, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.24, 0.32]} />
            <meshStandardMaterial map={tex.manual} roughness={0.6} />
          </mesh>
          <mesh position={[-0.119, 0.02, 0]}>
            <boxGeometry args={[0.006, 0.042, 0.322]} />
            <meshStandardMaterial color="#141210" roughness={0.6} />
          </mesh>
        </group>
        {/* open notebook */}
        {v !== 3 && (
          <group position={[v % 2 ? -0.18 : 0.14, 0, 0.06]} rotation-y={v % 2 ? 0.12 : -0.08}>
            <mesh position={[0, 0.006, 0]} castShadow>
              <boxGeometry args={[0.46, 0.012, 0.29]} />
              <meshStandardMaterial color="#141210" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.0125, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.44, 0.275]} />
              <meshStandardMaterial map={tex.notebook} roughness={0.9} />
            </mesh>
            {/* gold pencil */}
            <group position={[0.15, 0.02, 0.03]} rotation={[0, 0.7, Math.PI / 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.006, 0.006, 0.17, 6]} />
                <meshStandardMaterial {...goldProps} />
              </mesh>
              <mesh position={[0, 0.095, 0]}>
                <coneGeometry args={[0.006, 0.02, 6]} />
                <meshStandardMaterial color="#e6caa0" roughness={0.8} />
              </mesh>
            </group>
          </group>
        )}
        {/* learner's permit */}
        {(v === 1 || v === 3) && (
          <mesh position={[0.46, 0.002, 0.18]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[0.12, 0.075]} />
            <meshStandardMaterial map={tex.permit} roughness={0.5} />
          </mesh>
        )}
        {(v === 0 || v === 2) && <TrafficCone position={[-0.52, 0, 0.18]} />}
        {v === 3 && (
          // water bottle, gold cap
          <group position={[-0.1, 0, 0.08]}>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.2, 20]} />
              <meshStandardMaterial color="#1a1715" roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.215, 0]}>
              <cylinderGeometry args={[0.028, 0.03, 0.03, 20]} />
              <meshStandardMaterial {...goldProps} />
            </mesh>
          </group>
        )}
      </group>

      {/* chair tucked in on the student's side, turned a touch */}
      <group position={[v % 2 ? 0.05 : -0.04, 0, DESK_D / 2 + 0.28]} rotation-y={(v - 1.5) * 0.06}>
        <StudentChair />
      </group>
    </group>
  );
}
