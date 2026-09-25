import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import {
  DISPLAY,
  MONTHS,
  SERIF,
  goldGradient,
  goldProps,
  blackLacquer,
  roundedRect,
  setTracking,
  star,
  useCanvasTexture,
  useLocalMinute,
} from "./shared";

/** Analog wall clock on the visitor's real local time: black lacquer, gold bezel. */
export function WallClock(props: { position: [number, number, number] }) {
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  const second = useRef<Group>(null);

  const [face] = useCanvasTexture(512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#fbf6e9");
    g.addColorStop(1, "#efe4c8");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#1a1714";
    c.font = `500 58px ${SERIF}`;
    const numerals = ["XII", "III", "VI", "IX"];
    numerals.forEach((n, i) => {
      const a = (i / 4) * Math.PI * 2;
      c.fillText(n, w / 2 + Math.sin(a) * 178, h / 2 - Math.cos(a) * 178);
    });
    c.font = `800 26px ${DISPLAY}`;
    setTracking(c, "6px");
    c.fillStyle = goldGradient(c, 150, 180);
    c.fillText("DRIVING KLASS", w / 2 + 3, 158);
    setTracking(c, "0px");
    for (let i = 0; i < 5; i += 1) {
      star(c, w / 2 - 56 + i * 28, 348, 10);
      c.fillStyle = "#c9a24a";
      c.fill();
    }
    // minute track
    for (let i = 0; i < 60; i += 1) {
      if (i % 15 === 0) continue;
      const a = (i / 60) * Math.PI * 2;
      const r0 = i % 5 === 0 ? 212 : 224;
      c.beginPath();
      c.moveTo(w / 2 + Math.sin(a) * r0, h / 2 - Math.cos(a) * r0);
      c.lineTo(w / 2 + Math.sin(a) * 236, h / 2 - Math.cos(a) * 236);
      c.lineWidth = i % 5 === 0 ? 6 : 2;
      c.strokeStyle = "#2a2622";
      c.stroke();
    }
  });

  useFrame(() => {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (second.current) second.current.rotation.z = -(s / 60) * Math.PI * 2;
  });

  return (
    <group {...props}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.08, 56]} />
        <meshStandardMaterial {...blackLacquer} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <torusGeometry args={[0.425, 0.024, 16, 72]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0, 0, 0.042]}>
        <circleGeometry args={[0.4, 56]} />
        <meshStandardMaterial map={face} roughness={0.7} />
      </mesh>
      {/* glass dome glint */}
      <mesh position={[0, 0, 0.13]}>
        <circleGeometry args={[0.4, 48]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05} metalness={0.2} />
      </mesh>
      <group ref={hour} position={[0, 0, 0.07]}>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.034, 0.19, 0.01]} />
          <meshStandardMaterial color="#15120f" />
        </mesh>
      </group>
      <group ref={minute} position={[0, 0, 0.085]}>
        <mesh position={[0, 0.135, 0]}>
          <boxGeometry args={[0.022, 0.27, 0.01]} />
          <meshStandardMaterial color="#15120f" />
        </mesh>
      </group>
      <group ref={second} position={[0, 0, 0.1]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.008, 0.32, 0.006]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <circleGeometry args={[0.022, 16]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.11]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.024, 0.024, 0.02, 16]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
    </group>
  );
}

/** Lesson dates dotted through the month so the calendar feels in use. */
function lessonDays(year: number, month: number) {
  const days = new Set<number>();
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d += 1) {
    const wd = new Date(year, month, d).getDay();
    if (wd === 2 || wd === 4 || wd === 6) days.add(d);
  }
  return days;
}

/** Hanging DrivingKlass wall calendar, always showing the visitor's current month. */
export function WallCalendar({ position }: { position: [number, number, number] }) {
  const now = useLocalMinute();
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const [texture] = useCanvasTexture(
    720,
    1000,
    (c, w, h) => {
      c.fillStyle = "#fbf7ee";
      c.fillRect(0, 0, w, h);
      // photo band: dusk road with a gold car silhouette feel
      const sky = c.createLinearGradient(0, 0, 0, 420);
      sky.addColorStop(0, "#1b1712");
      sky.addColorStop(0.6, "#3a2c18");
      sky.addColorStop(1, "#8a6a2e");
      c.fillStyle = sky;
      c.fillRect(0, 0, w, 420);
      c.fillStyle = "rgba(247,227,161,0.9)";
      c.beginPath();
      c.arc(w * 0.72, 250, 60, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#15120f";
      c.beginPath();
      c.moveTo(0, 420);
      c.lineTo(w * 0.42, 290);
      c.lineTo(w * 0.58, 290);
      c.lineTo(w, 420);
      c.fill();
      c.strokeStyle = "#e8c872";
      c.lineWidth = 6;
      c.setLineDash([26, 22]);
      c.beginPath();
      c.moveTo(w / 2, 300);
      c.lineTo(w / 2, 420);
      c.stroke();
      c.setLineDash([]);
      c.textAlign = "center";
      c.font = `800 44px ${DISPLAY}`;
      setTracking(c, "10px");
      c.fillStyle = goldGradient(c, 40, 100);
      c.fillText("DRIVING KLASS", w / 2 + 5, 96);
      setTracking(c, "0px");
      c.font = `italic 500 30px ${SERIF}`;
      c.fillStyle = "#f7ecd0";
      c.fillText("Where 5-Star Drivers Are Made", w / 2, 146);

      // month header
      c.fillStyle = "#141210";
      c.fillRect(0, 420, w, 96);
      c.font = `700 52px ${SERIF}`;
      c.fillStyle = goldGradient(c, 440, 500);
      c.fillText(`${MONTHS[now.getMonth()]} ${now.getFullYear()}`, w / 2, 488);

      const dows = ["S", "M", "T", "W", "T", "F", "S"];
      const cellW = (w - 60) / 7;
      c.font = `700 26px ${DISPLAY}`;
      c.fillStyle = "#8a7550";
      dows.forEach((d, i) => c.fillText(d, 30 + cellW * i + cellW / 2, 566));
      const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const lessons = lessonDays(now.getFullYear(), now.getMonth());
      for (let d = 1; d <= days; d += 1) {
        const idx = first + d - 1;
        const col = idx % 7;
        const row = Math.floor(idx / 7);
        const cx = 30 + cellW * col + cellW / 2;
        const cy = 626 + row * 66;
        if (d === now.getDate()) {
          c.beginPath();
          c.arc(cx, cy - 10, 28, 0, Math.PI * 2);
          c.fillStyle = "#c9a24a";
          c.fill();
          c.fillStyle = "#141210";
        } else {
          c.fillStyle = d < now.getDate() ? "#b3aa98" : "#2a2622";
        }
        c.font = `600 30px ${DISPLAY}`;
        c.fillText(String(d), cx, cy);
        if (lessons.has(d) && d !== now.getDate()) {
          c.beginPath();
          c.arc(cx, cy + 16, 4.5, 0, Math.PI * 2);
          c.fillStyle = "#c9a24a";
          c.fill();
        }
      }
      roundedRect(c, 30, h - 70, w - 60, 44, 10);
      c.fillStyle = "rgba(201,162,74,0.14)";
      c.fill();
      c.font = `600 22px ${DISPLAY}`;
      c.fillStyle = "#6f5a33";
      c.fillText("● Klass days   ·   drivingklass.com", w / 2, h - 40);
      c.textAlign = "left";
    },
    [dayKey],
  );

  return (
    <group position={position}>
      {/* brass hanger */}
      <mesh position={[0, 0.575, 0.01]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 12]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0, 0.53, 0.02]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 12]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      {/* backing and pages, with a hint of the stack below */}
      <mesh position={[0, 0, -0.005]} castShadow>
        <boxGeometry args={[0.76, 1.04, 0.012]} />
        <meshStandardMaterial color="#141210" roughness={0.5} />
      </mesh>
      {[0.004, 0.008].map((z, i) => (
        <mesh key={z} position={[0, -0.006 * (i + 1), z]}>
          <planeGeometry args={[0.7, 0.972]} />
          <meshStandardMaterial color={i ? "#f4efe2" : "#ebe4d2"} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.7, 0.972]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  );
}
