import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { getPackagesSortedByPosition } from "@/data/packages";
import {
  DISPLAY,
  MONTHS,
  SERIF,
  SLOGAN,
  WEEKDAYS,
  goldGradient,
  roundedRect,
  setTracking,
  star,
  useLocalMinute,
} from "./shared";

/**
 * The instructor's monitor: a live DrivingKlass dashboard. Packages and prices
 * are read straight from the site's own package list (src/data/packages), so
 * the screen can never drift from what drivingklass.com is actually selling.
 * Three slides rotate: the package menu, road test prep, and a student's
 * progress card. Painted on canvas, repainted only when the slide or the
 * minute changes.
 */

export const SCREEN_W = 1600;
export const SCREEN_H = 870;
const SLIDE_SECONDS = 7;

function formatTime(now: Date) {
  let h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function stars(c: CanvasRenderingContext2D, x: number, y: number, r: number, gap: number) {
  for (let i = 0; i < 5; i += 1) {
    star(c, x + i * gap, y, r);
    c.fillStyle = goldGradient(c, y - r, y + r);
    c.fill();
  }
}

function paintFrame(c: CanvasRenderingContext2D, now: Date) {
  const bg = c.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
  bg.addColorStop(0, "#0f0d0b");
  bg.addColorStop(1, "#1a1611");
  c.fillStyle = bg;
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const glow = c.createRadialGradient(420, 470, 40, 420, 470, 700);
  glow.addColorStop(0, "rgba(212,175,55,0.20)");
  glow.addColorStop(1, "rgba(212,175,55,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  // road lines racing in from the horizon, faint
  c.save();
  c.globalAlpha = 0.08;
  c.strokeStyle = "#e8c872";
  c.lineWidth = 3;
  for (let i = -6; i <= 6; i += 1) {
    c.beginPath();
    c.moveTo(420, 520);
    c.lineTo(420 + i * 160, SCREEN_H);
    c.stroke();
  }
  c.restore();

  // top bar
  c.fillStyle = "rgba(255,255,255,0.03)";
  c.fillRect(0, 0, SCREEN_W, 96);
  c.fillStyle = goldGradient(c, 0, 96);
  c.fillRect(0, 95, SCREEN_W, 2);
  c.font = `800 44px ${DISPLAY}`;
  setTracking(c, "10px");
  c.fillStyle = goldGradient(c, 24, 72);
  c.textBaseline = "middle";
  c.fillText("DRIVING KLASS", 52, 50);
  setTracking(c, "0px");
  c.textAlign = "right";
  c.font = `600 34px ${DISPLAY}`;
  c.fillStyle = "#f3ecdc";
  c.fillText(formatTime(now), SCREEN_W - 52, 38);
  c.font = `400 22px ${DISPLAY}`;
  c.fillStyle = "rgba(243,236,220,0.6)";
  c.fillText(`${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`, SCREEN_W - 52, 72);
  c.textAlign = "left";

  // left hero column
  c.textBaseline = "alphabetic";
  c.font = `italic 600 70px ${SERIF}`;
  c.fillStyle = "#f7ecd0";
  const words = SLOGAN.split(" ");
  const lines = [words.slice(0, 2).join(" "), words.slice(2, 4).join(" "), words.slice(4).join(" ")];
  lines.forEach((line, i) => c.fillText(line, 60, 260 + i * 86));
  stars(c, 88, 520, 26, 62);
  c.font = `500 24px ${DISPLAY}`;
  c.fillStyle = "rgba(243,236,220,0.72)";
  c.fillText("Carrollton, GA · Behind-the-wheel klasses", 60, 600);
  c.fillText("Pick-up & drop-off from home, work or school", 60, 636);

  // footer ticker
  c.fillStyle = "rgba(212,175,55,0.12)";
  c.fillRect(0, SCREEN_H - 70, SCREEN_W, 70);
  c.font = `700 24px ${DISPLAY}`;
  setTracking(c, "6px");
  c.fillStyle = "#e8c872";
  c.fillText("BOOK YOUR KLASS  ·  DRIVINGKLASS.COM  ·  ROAD TEST READY", 60, SCREEN_H - 26);
  setTracking(c, "0px");
}

function panel(c: CanvasRenderingContext2D, title: string) {
  roundedRect(c, 800, 140, 750, 640, 26);
  c.fillStyle = "rgba(255,255,255,0.045)";
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = "rgba(212,175,55,0.55)";
  c.stroke();
  c.font = `700 30px ${DISPLAY}`;
  setTracking(c, "5px");
  c.fillStyle = "#e8c872";
  c.fillText(title.toUpperCase(), 840, 200);
  setTracking(c, "0px");
}

function slidePackages(c: CanvasRenderingContext2D) {
  panel(c, "Behind-the-wheel packages");
  const pkgs = getPackagesSortedByPosition().filter((p) => !/rd\s*test/i.test(p.label));
  pkgs.slice(0, 9).forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 840 + col * 232;
    const y = 240 + row * 170;
    roundedRect(c, x, y, 212, 148, 18);
    const g = c.createLinearGradient(x, y, x, y + 148);
    g.addColorStop(0, i === 4 ? "rgba(212,175,55,0.30)" : "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = i === 4 ? "#e8c872" : "rgba(212,175,55,0.35)";
    c.lineWidth = i === 4 ? 3 : 1.5;
    c.stroke();
    c.font = `800 44px ${DISPLAY}`;
    c.fillStyle = "#f7ecd0";
    c.fillText(p.label.replace(/\n/g, " "), x + 22, y + 66);
    c.font = `700 32px ${DISPLAY}`;
    c.fillStyle = goldGradient(c, y + 90, y + 126);
    c.fillText(p.price.replace(/\.00$/, ""), x + 22, y + 118);
  });
}

function slideRoadTest(c: CanvasRenderingContext2D) {
  panel(c, "Road test ready");
  const pkgs = getPackagesSortedByPosition().filter((p) => /rd\s*test/i.test(p.label));
  pkgs.slice(0, 2).forEach((p, i) => {
    const x = 840 + i * 350;
    const y = 240;
    roundedRect(c, x, y, 322, 200, 22);
    const g = c.createLinearGradient(x, y, x + 322, y + 200);
    g.addColorStop(0, "rgba(212,175,55,0.32)");
    g.addColorStop(1, "rgba(212,175,55,0.06)");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "#e8c872";
    c.lineWidth = 2;
    c.stroke();
    c.font = `800 40px ${DISPLAY}`;
    c.fillStyle = "#f7ecd0";
    c.fillText((p.label.split("\n")[0] ?? p.label).replace(/\s*\+\s*$/, ""), x + 26, y + 70);
    c.font = `600 24px ${DISPLAY}`;
    c.fillStyle = "rgba(247,236,208,0.75)";
    c.fillText("+ ROAD TEST", x + 26, y + 108);
    c.font = `800 52px ${DISPLAY}`;
    c.fillStyle = goldGradient(c, y + 130, y + 180);
    c.fillText(p.price.replace(/\.00$/, ""), x + 26, y + 172);
  });
  const perks = [
    "Warm-up session right before your test",
    "Clean dual-pedal compact car",
    "Full insurance coverage",
    "Road test scheduling assistance",
    "Free pick-up & drop-off, 25-mile radius",
  ];
  c.font = `500 28px ${DISPLAY}`;
  perks.forEach((perk, i) => {
    const y = 510 + i * 52;
    star(c, 860, y - 10, 12);
    c.fillStyle = "#e8c872";
    c.fill();
    c.fillStyle = "#f3ecdc";
    c.fillText(perk, 890, y);
  });
}

function slideProgress(c: CanvasRenderingContext2D) {
  panel(c, "Klass report card");
  c.font = `600 30px ${DISPLAY}`;
  c.fillStyle = "#f3ecdc";
  c.fillText("Lesson 3 · Intersections & right-of-way", 840, 256);
  const skills: Array<[string, number]> = [
    ["Mirrors & blind spots", 0.94],
    ["Smooth braking", 0.88],
    ["4-way stops", 0.82],
    ["Parallel parking", 0.7],
    ["Highway merging", 0.64],
  ];
  skills.forEach(([label, v], i) => {
    const y = 320 + i * 74;
    c.font = `500 24px ${DISPLAY}`;
    c.fillStyle = "rgba(243,236,220,0.82)";
    c.fillText(label, 840, y);
    roundedRect(c, 840, y + 14, 470, 16, 8);
    c.fillStyle = "rgba(255,255,255,0.08)";
    c.fill();
    roundedRect(c, 840, y + 14, 470 * v, 16, 8);
    const g = c.createLinearGradient(840, 0, 840 + 470 * v, 0);
    g.addColorStop(0, "#9c7a2e");
    g.addColorStop(1, "#f0d58a");
    c.fillStyle = g;
    c.fill();
  });
  // grade medallion
  c.beginPath();
  c.arc(1420, 470, 92, 0, Math.PI * 2);
  c.fillStyle = goldGradient(c, 378, 562);
  c.fill();
  c.beginPath();
  c.arc(1420, 470, 78, 0, Math.PI * 2);
  c.fillStyle = "#141210";
  c.fill();
  c.textAlign = "center";
  c.font = `800 92px ${SERIF}`;
  c.fillStyle = goldGradient(c, 410, 510);
  c.fillText("A", 1420, 502);
  c.font = `700 20px ${DISPLAY}`;
  setTracking(c, "4px");
  c.fillStyle = "#e8c872";
  c.fillText("GRADE", 1420, 600);
  setTracking(c, "0px");
  c.textAlign = "left";
  c.font = `italic 500 28px ${SERIF}`;
  c.fillStyle = "rgba(247,236,208,0.85)";
  c.fillText("“Calm hands, sharp eyes. Road test ready.”", 840, 720);
}

const SLIDES = [slidePackages, slideRoadTest, slideProgress];

export function paintKlassScreen(c: CanvasRenderingContext2D, now: Date, slide: number) {
  paintFrame(c, now);
  SLIDES[slide % SLIDES.length]!(c);
  // slide pips
  for (let i = 0; i < SLIDES.length; i += 1) {
    c.beginPath();
    c.arc(1150 + i * 30, 755, i === slide % SLIDES.length ? 8 : 5, 0, Math.PI * 2);
    c.fillStyle = i === slide % SLIDES.length ? "#e8c872" : "rgba(232,200,114,0.35)";
    c.fill();
  }
}

export function KlassScreen({ width, height }: { width: number; height: number }) {
  const now = useLocalMinute();
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => s + 1), SLIDE_SECONDS * 1000);
    return () => clearInterval(id);
  }, []);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = SCREEN_W;
    c.height = SCREEN_H;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    const c = canvas.getContext("2d");
    if (!c) return;
    const paint = () => {
      paintKlassScreen(c, now, slide);
      texture.needsUpdate = true;
    };
    paint();
    document.fonts?.ready.then(paint);
  }, [canvas, texture, now, slide]);

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
