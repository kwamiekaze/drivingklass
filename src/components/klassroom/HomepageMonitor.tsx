import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { CanvasTexture, SRGBColorSpace, Vector3 } from "three";
import { getPackagesSortedByPosition } from "@/data/packages";
import carImageUrl from "@/assets/car-headlights-off.png";
import { SERIF, goldGradient, goldProps, roundedRect, star } from "./shared";

/**
 * The instructor's monitor, turned to portrait so it can show drivingklass.com
 * exactly as it looks on a phone. The real homepage runs inside it (spinning
 * gold car, working price wheel, road video), mounted as a live page in the 3D
 * scene. Until it loads, and whenever it is hidden behind something, a painted
 * still of the same homepage fills the glass.
 */

/** iPhone-sized viewport so the homepage lays out in its mobile form. */
const VIEW_W = 390;
const VIEW_H = 844;
export const SCREEN_W = 0.44;
export const SCREEN_H = (SCREEN_W * VIEW_H) / VIEW_W;
/** drei Html transform: world units per CSS pixel is distanceFactor / 400. */
const DISTANCE_FACTOR = (SCREEN_W / VIEW_W) * 400;
const HOMEPAGE_URL = "/?klassroom=1";

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** A faithful still of the mobile homepage, used as the poster frame. */
function paintPoster(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  road: HTMLImageElement | null,
  car: HTMLImageElement | null,
) {
  if (road) {
    const s = Math.max(w / road.width, h / road.height);
    const dw = road.width * s;
    const dh = road.height * s;
    c.drawImage(road, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f6d58f");
    g.addColorStop(0.35, "#8a6a34");
    g.addColorStop(0.36, "#3d3a36");
    g.addColorStop(1, "#1a1816");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  // header
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `700 ${w * 0.085}px ${SERIF}`;
  c.fillStyle = goldGradient(c, h * 0.03, h * 0.07);
  c.fillText("Driving Klass", w / 2, h * 0.05);
  for (let i = 0; i < 5; i += 1) {
    star(c, w / 2 - w * 0.12 + i * w * 0.06, h * 0.09, w * 0.022);
    c.fillStyle = goldGradient(c, h * 0.08, h * 0.1);
    c.fill();
  }
  // the price wheel
  const pkgs = getPackagesSortedByPosition();
  const cx = w / 2;
  const cy = h * 0.47;
  const rx = w * 0.4;
  const ry = h * 0.33;
  const r = w * 0.13;
  pkgs.forEach((p, i) => {
    const a = -Math.PI / 2 + (i / pkgs.length) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = goldGradient(c, y - r, y + r);
    c.fill();
    c.beginPath();
    c.arc(x, y, r * 0.88, 0, Math.PI * 2);
    const inner = c.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
    inner.addColorStop(0, "#2a2622");
    inner.addColorStop(1, "#0e0c0b");
    c.fillStyle = inner;
    c.fill();
    c.fillStyle = "#f1dfb0";
    const lines = p.label.split("\n").map((l) => l.trim()).filter(Boolean);
    const fs = lines.length > 1 ? r * 0.3 : r * 0.36;
    c.font = `700 ${fs}px ${SERIF}`;
    lines.forEach((line, li) => c.fillText(line, x, y + (li - (lines.length - 1) / 2) * fs * 1.15));
  });
  // the gold car
  if (car) {
    const cw = w * 0.42;
    const ch = (car.height / car.width) * cw;
    c.drawImage(car, cx - cw / 2, cy - ch / 2, cw, ch);
  }
  // price pill and stars
  c.fillStyle = "#fbf7ee";
  const pw = w * 0.3;
  const ph = h * 0.042;
  roundedRect(c, cx - pw / 2 - w * 0.08, h * 0.66, pw, ph, ph / 2);
  c.fill();
  c.font = `700 ${ph * 0.5}px ${SERIF}`;
  c.fillStyle = "#141210";
  c.fillText("$1,099", cx - w * 0.08, h * 0.66 + ph / 2);
  for (let i = 0; i < 5; i += 1) {
    star(c, cx - w * 0.2 + i * w * 0.1, h * 0.95, w * 0.035);
    c.fillStyle = goldGradient(c, h * 0.93, h * 0.97);
    c.fill();
  }
}

function usePosterTexture() {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = VIEW_W * 2;
    c.height = VIEW_H * 2;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => {
    let alive = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintPoster(ctx, canvas.width, canvas.height, null, null);
    texture.needsUpdate = true;
    Promise.all([loadImage("/videos/light-road-loop-poster.jpg"), loadImage(carImageUrl)]).then(([road, car]) => {
      if (!alive) return;
      paintPoster(ctx, canvas.width, canvas.height, road, car);
      texture.needsUpdate = true;
    });
    return () => {
      alive = false;
      texture.dispose();
    };
  }, [canvas, texture]);
  return texture;
}

export function HomepageMonitor({
  live,
  active,
}: {
  /** mount the real homepage now */
  live: boolean;
  /** the Packages stop is selected: the page takes taps directly */
  active: boolean;
}) {
  const poster = usePosterTexture();
  const { camera } = useThree();
  const screen = useRef<Group>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const world = useRef(new Vector3());

  useEffect(() => {
    if (live) setMounted(true);
  }, [live]);

  useFrame(() => {
    const g = screen.current;
    if (!g) return;
    g.getWorldPosition(world.current);
    const d = world.current.distanceTo(camera.position);
    // Walking up to the monitor wakes the live page on phones too.
    if (!mounted && d < 2.4) setMounted(true);
    const el = frame.current;
    if (el) {
      const hands = active || d < 1.15;
      const pe = hands ? "auto" : "none";
      if (el.style.pointerEvents !== pe) el.style.pointerEvents = pe;
    }
  });

  return (
    <group position={[0, 0.78, -2.75]}>
      {/* weighted brass foot */}
      <mesh position={[0, 0.012, 0.02]} scale={[1.5, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.14, 0.024, 40]} />
        <meshStandardMaterial {...goldProps} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.006, 0.02]} rotation-x={-Math.PI / 2} renderOrder={1}>
        <circleGeometry args={[0.26, 40]} />
        <meshBasicMaterial color="#2b1d12" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {/* pivot arm */}
      <mesh position={[0, 0.2, -0.02]} castShadow>
        <boxGeometry args={[0.06, 0.38, 0.03]} />
        <meshStandardMaterial color="#1a1715" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.38, -0.01]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 28]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <group ref={screen} position={[0, 0.12 + SCREEN_H / 2 + 0.02, 0.012]} rotation-x={-0.035}>
        {/* bezel and back shell */}
        <mesh position={[0, 0, -0.016]} castShadow>
          <boxGeometry args={[SCREEN_W + 0.034, SCREEN_H + 0.034, 0.03]} />
          <meshStandardMaterial color="#0f0d0c" roughness={0.35} metalness={0.25} />
        </mesh>
        {/* hairline gold edge */}
        <mesh position={[0, 0, -0.033]}>
          <boxGeometry args={[SCREEN_W + 0.044, SCREEN_H + 0.044, 0.006]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
        {/* painted still of the homepage */}
        <mesh position={[0, 0, 0.0005]}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial map={poster} toneMapped={false} />
        </mesh>
        {/* soft screen glow onto the desk */}
        <pointLight position={[0, -0.1, 0.25]} intensity={0.35} distance={1.4} color="#ffd9a0" />
        {mounted && (
          <Html
            transform
            occlude
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0.003]}
            zIndexRange={[5, 0]}
            style={{ width: VIEW_W, height: VIEW_H }}
          >
            <iframe
              ref={frame}
              title="drivingklass.com"
              src={HOMEPAGE_URL}
              width={VIEW_W}
              height={VIEW_H}
              allow="autoplay; fullscreen"
              loading="eager"
              onLoad={() => window.setTimeout(() => setShown(true), 1400)}
              style={{
                width: VIEW_W,
                height: VIEW_H,
                border: 0,
                display: "block",
                background: "#0e0c0b",
                pointerEvents: "none",
                borderRadius: 4,
                opacity: shown ? 1 : 0,
                transition: "opacity 900ms ease",
              }}
            />
          </Html>
        )}
      </group>
    </group>
  );
}
