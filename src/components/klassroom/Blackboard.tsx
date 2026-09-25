import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { CanvasTexture, SRGBColorSpace } from "three";
import { CHALK, DISPLAY, MONTHS, SLOGAN, WEEKDAYS, blackLacquer, brushedGold, goldProps, star } from "./shared";

/**
 * The Klassroom chalkboard. A live lesson is written out in chalk, stroke by
 * stroke, with a real stick of chalk travelling across the slate as it writes.
 * When the lesson is complete it holds, then the felt eraser wipes the board
 * clean and the next lesson is written. All of it is 2D canvas work composited
 * into a single texture, so nothing is downloaded.
 */

export const BOARD_W = 3.6;
export const BOARD_H = 1.6;
const TEX_W = 2304;
const TEX_H = 1024;

const CHALK_WHITE = "rgba(244,242,232,0.95)";
const CHALK_YELLOW = "rgba(250,226,140,0.95)";
const CHALK_PINK = "rgba(248,186,196,0.95)";
const CHALK_BLUE = "rgba(170,214,240,0.95)";

type Box = { x: number; y: number; w: number; h: number };
interface Stroke {
  box: Box;
  /** seconds to write */
  dur: number;
  draw: (c: CanvasRenderingContext2D) => void;
}

interface Lesson {
  title: string;
  strokes: (now: Date) => Stroke[];
}

function jitter(amount: number) {
  return (Math.random() - 0.5) * amount;
}

/** Chalky text: several faint passes with a little wander, like a real stick. */
function chalkText(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = CHALK_WHITE,
  weight = 600,
) {
  c.font = `${weight} ${size}px ${CHALK}`;
  c.fillStyle = color;
  c.textBaseline = "alphabetic";
  const passes = 4;
  for (let i = 0; i < passes; i += 1) {
    c.globalAlpha = 0.34;
    c.fillText(text, x + jitter(2.4), y + jitter(2.4));
  }
  c.globalAlpha = 1;
}

function chalkLine(
  c: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  width = 6,
  color = CHALK_WHITE,
) {
  c.strokeStyle = color;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (let pass = 0; pass < 3; pass += 1) {
    c.globalAlpha = 0.42;
    c.lineWidth = width * (0.7 + pass * 0.2);
    c.beginPath();
    points.forEach(([px, py], i) => {
      const jx = px + jitter(2.2);
      const jy = py + jitter(2.2);
      if (i === 0) c.moveTo(jx, jy);
      else c.lineTo(jx, jy);
    });
    c.stroke();
  }
  c.globalAlpha = 1;
}

function chalkArrow(
  c: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color = CHALK_YELLOW,
) {
  chalkLine(c, points, 6, color);
  const [ax, ay] = points[points.length - 2]!;
  const [bx, by] = points[points.length - 1]!;
  const a = Math.atan2(by - ay, bx - ax);
  const head = 26;
  chalkLine(
    c,
    [
      [bx - Math.cos(a - 0.5) * head, by - Math.sin(a - 0.5) * head],
      [bx, by],
      [bx - Math.cos(a + 0.5) * head, by - Math.sin(a + 0.5) * head],
    ],
    6,
    color,
  );
}

function chalkCar(c: CanvasRenderingContext2D, x: number, y: number, rot: number, n: string, color: string) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  chalkLine(c, [[-26, -44], [26, -44], [30, 40], [-30, 40], [-26, -44]], 5, color);
  chalkLine(c, [[-18, -24], [18, -24]], 4, color);
  c.restore();
  chalkText(c, n, x - 9, y + 12, 38, color, 700);
}

function octagon(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i += 1) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  chalkLine(c, pts, 4, CHALK_PINK);
  c.font = `700 ${r * 0.62}px ${DISPLAY}`;
  c.globalAlpha = 0.7;
  c.fillStyle = CHALK_PINK;
  c.textAlign = "center";
  c.fillText("STOP", x, y + r * 0.22);
  c.textAlign = "left";
  c.globalAlpha = 1;
}

function chalkStars(c: CanvasRenderingContext2D, x: number, y: number, r: number, gap: number) {
  for (let i = 0; i < 5; i += 1) {
    c.save();
    star(c, x + i * gap, y, r);
    c.globalAlpha = 0.38;
    c.fillStyle = CHALK_YELLOW;
    c.fill();
    c.globalAlpha = 0.75;
    c.lineWidth = 4;
    c.strokeStyle = CHALK_YELLOW;
    c.stroke();
    c.restore();
  }
  c.globalAlpha = 1;
}

function dateLine(now: Date) {
  return `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

const LESSONS: Lesson[] = [
  {
    title: "4-way stop",
    strokes: (now) => [
      {
        box: { x: 80, y: 40, w: 620, h: 70 },
        dur: 1.4,
        draw: (c) => chalkText(c, "TODAY'S KLASS", 84, 98, 54, CHALK_BLUE, 700),
      },
      {
        box: { x: 1600, y: 40, w: 640, h: 70 },
        dur: 1.4,
        draw: (c) => {
          c.textAlign = "right";
          chalkText(c, dateLine(now), 2230, 98, 52, CHALK_WHITE);
          c.textAlign = "left";
        },
      },
      {
        box: { x: 80, y: 120, w: 1500, h: 130 },
        dur: 2.6,
        draw: (c) => {
          chalkText(c, "Right-of-Way at a 4-Way Stop", 84, 212, 104, CHALK_WHITE, 700);
          chalkLine(c, [[90, 236], [1300, 230], [1440, 238]], 5, CHALK_YELLOW);
        },
      },
      {
        box: { x: 80, y: 270, w: 700, h: 640 },
        dur: 3.2,
        draw: (c) => {
          // two roads crossing
          chalkLine(c, [[330, 280], [330, 480]], 6);
          chalkLine(c, [[530, 280], [530, 480]], 6);
          chalkLine(c, [[330, 680], [330, 900]], 6);
          chalkLine(c, [[530, 680], [530, 900]], 6);
          chalkLine(c, [[100, 480], [330, 480]], 6);
          chalkLine(c, [[100, 680], [330, 680]], 6);
          chalkLine(c, [[530, 480], [770, 480]], 6);
          chalkLine(c, [[530, 680], [770, 680]], 6);
          // dashed centre lines
          for (let yy = 290; yy < 470; yy += 44) chalkLine(c, [[430, yy], [430, yy + 22]], 4, CHALK_YELLOW);
          for (let yy = 700; yy < 900; yy += 44) chalkLine(c, [[430, yy], [430, yy + 22]], 4, CHALK_YELLOW);
          for (let xx = 110; xx < 320; xx += 44) chalkLine(c, [[xx, 580], [xx + 22, 580]], 4, CHALK_YELLOW);
          for (let xx = 545; xx < 760; xx += 44) chalkLine(c, [[xx, 580], [xx + 22, 580]], 4, CHALK_YELLOW);
          octagon(c, 282, 432, 34);
          octagon(c, 578, 728, 34);
        },
      },
      {
        box: { x: 120, y: 330, w: 640, h: 540 },
        dur: 2.4,
        draw: (c) => {
          chalkCar(c, 480, 380, 0, "1", CHALK_BLUE);
          chalkCar(c, 190, 630, -Math.PI / 2, "2", CHALK_PINK);
          chalkCar(c, 380, 800, Math.PI, "3", CHALK_WHITE);
          chalkArrow(c, [[480, 440], [480, 560], [470, 660]], CHALK_BLUE);
          chalkArrow(c, [[250, 630], [380, 626], [500, 640]], CHALK_PINK);
          chalkArrow(c, [[380, 740], [382, 640], [420, 540], [560, 520]], CHALK_WHITE);
        },
      },
      {
        box: { x: 820, y: 290, w: 720, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "1.", 830, 354, 62, CHALK_YELLOW, 700);
          chalkText(c, "First to stop, first to go", 900, 354, 60);
        },
      },
      {
        box: { x: 820, y: 400, w: 720, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "2.", 830, 464, 62, CHALK_YELLOW, 700);
          chalkText(c, "A tie? Yield to your right", 900, 464, 60);
        },
      },
      {
        box: { x: 820, y: 510, w: 720, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "3.", 830, 574, 62, CHALK_YELLOW, 700);
          chalkText(c, "Straight goes before turns", 900, 574, 60);
        },
      },
      {
        box: { x: 820, y: 620, w: 720, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "4.", 830, 684, 62, CHALK_YELLOW, 700);
          chalkText(c, "Pedestrians always first", 900, 684, 60);
        },
      },
      {
        box: { x: 1590, y: 250, w: 640, h: 380 },
        dur: 2.4,
        draw: (c) => {
          // steering wheel with hands at 9 and 3
          const cx = 1780;
          const cy = 430;
          const pts: Array<[number, number]> = [];
          for (let i = 0; i <= 40; i += 1) {
            const a = (i / 40) * Math.PI * 2;
            pts.push([cx + Math.cos(a) * 140, cy + Math.sin(a) * 140]);
          }
          chalkLine(c, pts, 8);
          chalkLine(c, [[cx - 138, cy], [cx - 40, cy + 10]], 7);
          chalkLine(c, [[cx + 138, cy], [cx + 40, cy + 10]], 7);
          chalkLine(c, [[cx, cy + 50], [cx, cy + 138]], 7);
          const hub: Array<[number, number]> = [];
          for (let i = 0; i <= 20; i += 1) {
            const a = (i / 20) * Math.PI * 2;
            hub.push([cx + Math.cos(a) * 44, cy + 8 + Math.sin(a) * 40]);
          }
          chalkLine(c, hub, 6);
          for (const side of [-1, 1]) {
            c.beginPath();
            c.arc(cx + side * 142, cy, 22, 0, Math.PI * 2);
            c.globalAlpha = 0.5;
            c.fillStyle = CHALK_PINK;
            c.fill();
            c.globalAlpha = 1;
          }
          chalkText(c, "9", cx - 212, cy + 18, 58, CHALK_PINK, 700);
          chalkText(c, "3", cx + 178, cy + 18, 58, CHALK_PINK, 700);
          chalkText(c, "hands at", 1990, 340, 48, CHALK_BLUE);
          chalkText(c, "9 & 3", 2010, 398, 62, CHALK_BLUE, 700);
        },
      },
      {
        box: { x: 1590, y: 630, w: 660, h: 210 },
        dur: 2.2,
        draw: (c) => {
          chalkText(c, "Pre-drive check", 1610, 684, 54, CHALK_YELLOW, 700);
          const items = ["Seatbelt", "Mirrors", "Signal", "Head check"];
          items.forEach((item, i) => {
            const x = 1614 + (i % 2) * 320;
            const y = 752 + Math.floor(i / 2) * 64;
            chalkLine(c, [[x, y - 18], [x + 12, y - 4], [x + 34, y - 36]], 5, CHALK_BLUE);
            chalkText(c, item, x + 48, y, 48);
          });
        },
      },
      {
        box: { x: 820, y: 850, w: 1420, h: 150 },
        dur: 3.4,
        draw: (c) => {
          chalkText(c, SLOGAN, 836, 942, 84, CHALK_WHITE, 700);
          chalkStars(c, 1930, 912, 30, 72);
          chalkLine(c, [[840, 968], [1860, 962]], 5, CHALK_YELLOW);
          chalkLine(c, [[870, 986], [1820, 982]], 4, CHALK_YELLOW);
        },
      },
    ],
  },
  {
    title: "3-point turn",
    strokes: (now) => [
      {
        box: { x: 80, y: 40, w: 620, h: 70 },
        dur: 1.4,
        draw: (c) => chalkText(c, "TODAY'S KLASS", 84, 98, 54, CHALK_BLUE, 700),
      },
      {
        box: { x: 1600, y: 40, w: 640, h: 70 },
        dur: 1.4,
        draw: (c) => {
          c.textAlign = "right";
          chalkText(c, dateLine(now), 2230, 98, 52, CHALK_WHITE);
          c.textAlign = "left";
        },
      },
      {
        box: { x: 80, y: 120, w: 1500, h: 130 },
        dur: 2.4,
        draw: (c) => {
          chalkText(c, "The Perfect 3-Point Turn", 84, 212, 104, CHALK_WHITE, 700);
          chalkLine(c, [[90, 236], [1180, 230], [1250, 238]], 5, CHALK_YELLOW);
        },
      },
      {
        box: { x: 80, y: 280, w: 980, h: 560 },
        dur: 3.6,
        draw: (c) => {
          // street edges and centre line
          chalkLine(c, [[100, 320], [1040, 320]], 7);
          chalkLine(c, [[100, 800], [1040, 800]], 7);
          for (let xx = 120; xx < 1030; xx += 70) chalkLine(c, [[xx, 560], [xx + 36, 560]], 4, CHALK_YELLOW);
          chalkCar(c, 280, 700, Math.PI / 2, "", CHALK_WHITE);
          chalkArrow(c, [[330, 700], [520, 640], [640, 420], [660, 370]], CHALK_BLUE);
          chalkText(c, "1", 560, 540, 64, CHALK_BLUE, 700);
          chalkArrow(c, [[640, 380], [700, 520], [760, 700], [790, 740]], CHALK_PINK);
          chalkText(c, "2", 780, 640, 64, CHALK_PINK, 700);
          chalkArrow(c, [[780, 720], [720, 520], [560, 420], [260, 420]], CHALK_YELLOW);
          chalkText(c, "3", 450, 400, 64, CHALK_YELLOW, 700);
        },
      },
      {
        box: { x: 1100, y: 300, w: 1140, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "1.", 1110, 360, 62, CHALK_BLUE, 700);
          chalkText(c, "Signal left, check blind spot, turn full left", 1180, 360, 54);
        },
      },
      {
        box: { x: 1100, y: 410, w: 1140, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "2.", 1110, 470, 62, CHALK_PINK, 700);
          chalkText(c, "Reverse, full right, look behind you", 1180, 470, 54);
        },
      },
      {
        box: { x: 1100, y: 520, w: 1140, h: 90 },
        dur: 1.8,
        draw: (c) => {
          chalkText(c, "3.", 1110, 580, 62, CHALK_YELLOW, 700);
          chalkText(c, "Forward, straighten out, go", 1180, 580, 54);
        },
      },
      {
        box: { x: 1100, y: 640, w: 1140, h: 170 },
        dur: 2.2,
        draw: (c) => {
          chalkText(c, "Slow & smooth wins the road test", 1110, 700, 56, CHALK_BLUE, 700);
          chalkText(c, "No curb taps. No rush. Eyes up.", 1110, 780, 50, CHALK_WHITE);
        },
      },
      {
        box: { x: 820, y: 850, w: 1420, h: 150 },
        dur: 3.4,
        draw: (c) => {
          chalkText(c, SLOGAN, 836, 942, 84, CHALK_WHITE, 700);
          chalkStars(c, 1930, 912, 30, 72);
          chalkLine(c, [[840, 968], [1860, 962]], 5, CHALK_YELLOW);
          chalkLine(c, [[870, 986], [1820, 982]], 4, CHALK_YELLOW);
        },
      },
    ],
  },
];

/** Deep slate with the ghost of lessons past rubbed into it. */
function paintSlate(c: CanvasRenderingContext2D) {
  const g = c.createLinearGradient(0, 0, TEX_W, TEX_H);
  g.addColorStop(0, "#23302a");
  g.addColorStop(0.5, "#1c2822");
  g.addColorStop(1, "#18221d");
  c.fillStyle = g;
  c.fillRect(0, 0, TEX_W, TEX_H);
  // soft vignette
  const v = c.createRadialGradient(TEX_W / 2, TEX_H / 2, 200, TEX_W / 2, TEX_H / 2, TEX_W * 0.7);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.35)");
  c.fillStyle = v;
  c.fillRect(0, 0, TEX_W, TEX_H);
  // eraser swirls
  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    const r = 80 + Math.random() * 220;
    const s = c.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, "rgba(220,230,220,0.05)");
    s.addColorStop(1, "rgba(220,230,220,0)");
    c.fillStyle = s;
    c.beginPath();
    c.ellipse(x, y, r * 1.6, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  // fine grain
  const img = c.getImageData(0, 0, TEX_W, TEX_H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    d[i] = d[i]! + n;
    d[i + 1] = d[i + 1]! + n;
    d[i + 2] = d[i + 2]! + n;
  }
  c.putImageData(img, 0, 0);
}

/** Knock random pinholes out of the chalk so it reads as dusty, not printed. */
function grainChalk(c: CanvasRenderingContext2D) {
  c.save();
  c.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 90000; i += 1) {
    c.globalAlpha = 0.25 + Math.random() * 0.6;
    c.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1.6, 1.6);
  }
  c.restore();
}

interface Timeline {
  layer: HTMLCanvasElement;
  strokes: Array<Stroke & { start: number; end: number }>;
  writeEnd: number;
}

function buildTimeline(lesson: Lesson, now: Date): Timeline {
  const layer = document.createElement("canvas");
  layer.width = TEX_W;
  layer.height = TEX_H;
  const c = layer.getContext("2d")!;
  const strokes = lesson.strokes(now);
  let t = 0.6;
  const timed = strokes.map((s) => {
    const start = t;
    const end = t + s.dur;
    t = end + 0.35;
    return { ...s, start, end };
  });
  for (const s of timed) s.draw(c);
  grainChalk(c);
  return { layer, strokes: timed, writeEnd: t };
}

const HOLD = 16;
const ERASE = 3.2;

export function Blackboard({
  position,
  reducedMotion,
}: {
  position: [number, number, number];
  reducedMotion: boolean;
}) {
  const slate = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    paintSlate(c.getContext("2d")!);
    return c;
  }, []);
  const out = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new CanvasTexture(out);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [out]);
  useEffect(() => () => texture.dispose(), [texture]);

  const lessonIndex = useRef(0);
  const timeline = useRef<Timeline | null>(null);
  const cycleStart = useRef<number | null>(null);
  const lastPaint = useRef(-1);
  const chalk = useRef<Group>(null);
  const eraser = useRef<Group>(null);
  const fontsReady = useRef(false);

  useEffect(() => {
    let alive = true;
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      if (!alive) return;
      fontsReady.current = true;
      timeline.current = null;
      cycleStart.current = null;
    });
    return () => {
      alive = false;
    };
  }, []);

  const toBoard = (px: number, py: number): [number, number] => [
    (px / TEX_W - 0.5) * BOARD_W,
    (0.5 - py / TEX_H) * BOARD_H,
  ];

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const ease = (rate: number) => 1 - Math.exp(-Math.min(delta, 0.1) * rate);
    if (!timeline.current) {
      timeline.current = buildTimeline(LESSONS[lessonIndex.current % LESSONS.length]!, new Date());
      cycleStart.current = now;
    }
    const tl = timeline.current;
    const t = reducedMotion ? tl.writeEnd + 1 : now - (cycleStart.current ?? now);
    const eraseStart = tl.writeEnd + HOLD;

    // Repaint at ~30fps while something is changing, otherwise leave it be.
    const busy = t < tl.writeEnd + 0.1 || (t >= eraseStart && t <= eraseStart + ERASE + 0.1);
    if (busy || lastPaint.current < 0) {
      if (now - lastPaint.current >= 1 / 30 || lastPaint.current < 0) {
        lastPaint.current = now;
        const c = out.getContext("2d")!;
        c.drawImage(slate, 0, 0);
        if (t < eraseStart) {
          for (const s of tl.strokes) {
            if (t <= s.start) continue;
            const p = Math.min(1, (t - s.start) / (s.end - s.start));
            const { x, y, w, h } = s.box;
            const ww = Math.max(1, w * p);
            c.drawImage(tl.layer, x, y, ww, h, x, y, ww, h);
          }
        } else {
          // Eraser sweeps right to left in a couple of passes; what it has
          // passed over is left as a faint smear.
          const e = Math.min(1, (t - eraseStart) / ERASE);
          const edge = TEX_W * (1 - e);
          c.drawImage(tl.layer, 0, 0, Math.max(1, edge), TEX_H, 0, 0, Math.max(1, edge), TEX_H);
          c.globalAlpha = 0.08;
          c.drawImage(tl.layer, edge, 0, Math.max(1, TEX_W - edge), TEX_H, edge, 0, Math.max(1, TEX_W - edge), TEX_H);
          c.globalAlpha = 1;
        }
        texture.needsUpdate = true;
      }
    }

    // Chalk stick follows the stroke being written.
    const stick = chalk.current;
    if (stick) {
      const active = tl.strokes.find((s) => t > s.start && t < s.end);
      if (active && !reducedMotion) {
        const p = (t - active.start) / (active.end - active.start);
        const px = active.box.x + active.box.w * p;
        const wobble = Math.sin(t * 38) * 0.18 + Math.sin(t * 13) * 0.25;
        const py = active.box.y + active.box.h * (0.55 + wobble * 0.3);
        const [bx, by] = toBoard(px, py);
        stick.position.x += (bx + 0.02 - stick.position.x) * ease(20);
        stick.position.y += (by - 0.04 - stick.position.y) * ease(20);
        stick.position.z += (0.045 - stick.position.z) * ease(18);
        stick.rotation.z = 0.9 + Math.sin(t * 9) * 0.06;
        stick.rotation.x = -0.5;
      } else {
        // rest in the tray
        stick.position.x += (-1.05 - stick.position.x) * ease(5);
        stick.position.y += (-BOARD_H / 2 - 0.1 - stick.position.y) * ease(5);
        stick.position.z += (0.1 - stick.position.z) * ease(5);
        stick.rotation.z += (Math.PI / 2 - stick.rotation.z) * ease(5);
        stick.rotation.x += (0 - stick.rotation.x) * ease(5);
      }
    }

    const felt = eraser.current;
    if (felt) {
      if (t >= eraseStart && t <= eraseStart + ERASE && !reducedMotion) {
        const e = (t - eraseStart) / ERASE;
        const px = TEX_W * (1 - e);
        const py = TEX_H * (0.5 + Math.sin(e * Math.PI * 7) * 0.36);
        const [bx, by] = toBoard(px, py);
        felt.position.set(bx, by, 0.06);
        felt.rotation.set(Math.PI / 2, 0, Math.sin(e * 20) * 0.1);
      } else {
        felt.position.x += (0.9 - felt.position.x) * ease(6);
        felt.position.y += (-BOARD_H / 2 - 0.085 - felt.position.y) * ease(6);
        felt.position.z += (0.11 - felt.position.z) * ease(6);
        felt.rotation.x += (0 - felt.rotation.x) * ease(6);
        felt.rotation.z += (0 - felt.rotation.z) * ease(6);
      }
    }

    if (!reducedMotion && t > eraseStart + ERASE + 0.8) {
      lessonIndex.current += 1;
      timeline.current = null;
    }
  });

  const frame = 0.09;
  return (
    <group position={position}>
      {/* lacquered black frame with an inset gold bead */}
      <mesh position={[0, 0, -0.03]} castShadow receiveShadow>
        <boxGeometry args={[BOARD_W + frame * 2, BOARD_H + frame * 2, 0.06]} />
        <meshStandardMaterial {...blackLacquer} />
      </mesh>
      {(
        [
          [0, BOARD_H / 2 + 0.012, BOARD_W + 0.05, 0.022],
          [0, -BOARD_H / 2 - 0.012, BOARD_W + 0.05, 0.022],
          [BOARD_W / 2 + 0.012, 0, 0.022, BOARD_H + 0.05],
          [-BOARD_W / 2 - 0.012, 0, 0.022, BOARD_H + 0.05],
        ] as Array<[number, number, number, number]>
      ).map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.006]}>
          <boxGeometry args={[w, h, 0.018]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      ))}
      {/* the slate itself */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[BOARD_W, BOARD_H]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
      </mesh>
      {/* chalk tray */}
      <group position={[0, -BOARD_H / 2 - frame - 0.01, 0.05]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[BOARD_W + 0.1, 0.035, 0.13]} />
          <meshStandardMaterial {...blackLacquer} />
        </mesh>
        <mesh position={[0, 0.025, 0.06]}>
          <boxGeometry args={[BOARD_W + 0.1, 0.02, 0.012]} />
          <meshStandardMaterial {...brushedGold} />
        </mesh>
        {/* a little chalk dust along the tray */}
        <mesh position={[-0.4, 0.019, 0]} rotation-x={-Math.PI / 2} scale={[3, 0.5, 1]}>
          <circleGeometry args={[0.1, 20]} />
          <meshBasicMaterial color="#e8e6dc" transparent opacity={0.28} depthWrite={false} />
        </mesh>
        {/* spare chalk */}
        {(
          [
            [-0.72, "#f4f1e6"],
            [-0.6, "#f6dd86"],
            [-0.5, "#f3b5c1"],
            [-0.38, "#a9d4ef"],
          ] as Array<[number, string]>
        ).map(([x, color], i) => (
          <mesh key={i} position={[x, 0.033, i % 2 ? 0.01 : -0.02]} rotation={[0, 0.3 * (i - 1.5), Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.011, 0.011, i === 2 ? 0.06 : 0.09, 10]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        ))}
      </group>
      {/* the working stick of chalk */}
      <group ref={chalk} position={[-1.05, -BOARD_H / 2 - 0.1, 0.1]} rotation-z={Math.PI / 2}>
        <mesh castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.085, 10]} />
          <meshStandardMaterial color="#f7f4ea" roughness={1} />
        </mesh>
      </group>
      {/* felt eraser with a walnut back and a gold DK plate */}
      <group ref={eraser} position={[0.9, -BOARD_H / 2 - 0.085, 0.11]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.05, 0.075]} />
          <meshStandardMaterial color="#4a2f1b" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.031, 0]}>
          <boxGeometry args={[0.2, 0.014, 0.075]} />
          <meshStandardMaterial color="#d9d4c6" roughness={1} />
        </mesh>
        <mesh position={[0, 0.027, 0]}>
          <boxGeometry args={[0.08, 0.004, 0.03]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      </group>
    </group>
  );
}
