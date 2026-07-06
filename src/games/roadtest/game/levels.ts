import type { LevelConfig, ObstacleType, StageFlavor } from './types';

/** Helper for concise stage definitions. Every stage gets sensible defaults;
 *  fields the engine already reads (features/length/speedLimit/etc.) are all
 *  parameterised so we don't need bespoke scenes per stage. */
type StageDef = {
  id: string;
  name: string;
  subtitle: string;
  objective: string;
  flavor: StageFlavor;
  chapter: 1 | 2 | 3 | 4 | 5;
  stageNumber: number;
  speedLimit: number;
  maxSpeed?: number;      // defaults speedLimit + 15
  length?: number;        // defaults 8000
  obstacleGap?: number;   // defaults 320
  parScore: number;
  features: ObstacleType[];
  shoulderColor?: number; // defaults 0x35414a
  nightAlpha?: number;
  endless?: boolean;
  isDaily?: boolean;
};

function build(def: StageDef): LevelConfig {
  const par = def.parScore;
  return {
    id: def.id,
    name: def.name,
    subtitle: def.subtitle,
    length: def.length ?? 8000,
    speedLimit: def.speedLimit,
    maxSpeed: def.maxSpeed ?? def.speedLimit + 15,
    features: def.features,
    obstacleGap: def.obstacleGap ?? 320,
    parScore: par,
    shoulderColor: def.shoulderColor ?? 0x35414a,
    nightAlpha: def.nightAlpha,
    endless: def.endless,
    chapter: def.chapter,
    stageNumber: def.stageNumber,
    flavor: def.flavor,
    objective: def.objective,
    starThresholds: [Math.round(par * 0.5), Math.round(par * 0.75), par],
    isDaily: def.isDaily,
  };
}

const STAGES: LevelConfig[] = [
  // ============== CH1 FUNDAMENTALS ==============
  build({
    id: 'first-drive', name: 'First Drive', subtitle: 'Ch 1 · Calm streets. Just get to the end',
    objective: 'Reach the destination without stalling out',
    flavor: 'fundamentals', chapter: 1, stageNumber: 1,
    speedLimit: 25, length: 6000, obstacleGap: 420, parScore: 550,
    features: ['cone', 'checkpoint', 'star'], shoulderColor: 0x4a4a50,
  }),
  build({
    id: 'signal-school', name: 'Signal School', subtitle: 'Ch 1 · Signs, stops, and smooth turns',
    objective: 'Full stop at every sign — clean 3★ = zero rolled stops',
    flavor: 'signals', chapter: 1, stageNumber: 2,
    speedLimit: 30, length: 7000, obstacleGap: 360, parScore: 750,
    features: ['cone', 'stopSign', 'checkpoint', 'star'], shoulderColor: 0x3c5a34,
  }),
  build({
    id: 'stop-and-go', name: 'Stop & Go', subtitle: 'Ch 1 · Full-stop discipline on every sign',
    objective: 'Full stops only. Rolling stops cost big',
    flavor: 'stops', chapter: 1, stageNumber: 3,
    speedLimit: 30, length: 7500, obstacleGap: 320, parScore: 850,
    features: ['cone', 'stopSign', 'parkedCar', 'checkpoint', 'star'], shoulderColor: 0x3c5a34,
  }),
  build({
    id: 'pedestrian-watch', name: 'Pedestrian Watch', subtitle: 'Ch 1 · Heavy crosswalks. Yield to walkers',
    objective: 'Yield to every pedestrian. Hitting one voids the run',
    flavor: 'pedestrians', chapter: 1, stageNumber: 4,
    speedLimit: 25, length: 7500, obstacleGap: 300, parScore: 900,
    features: ['cone', 'stopSign', 'pedestrian', 'checkpoint', 'star'], shoulderColor: 0x4f6a3d,
  }),
  build({
    id: 'night-drive', name: 'Night Drive', subtitle: 'Ch 1 · Low visibility. Trust your headlights',
    objective: 'Finish safely in the dark. Watch the sidewalks',
    flavor: 'night', chapter: 1, stageNumber: 5,
    speedLimit: 35, length: 8500, obstacleGap: 320, parScore: 1000,
    features: ['cone', 'stopSign', 'parkedCar', 'pedestrian', 'checkpoint', 'star'],
    shoulderColor: 0x141420, nightAlpha: 0.34,
  }),

  // ============== CH2 ROUNDABOUT ACADEMY ==============
  // (stylised roundabout stages — circulating traffic + yield & signal cues
  //  are expressed via traffic-light + stopSign checkpoints on the existing scene)
  build({
    id: 'first-circle', name: 'First Circle', subtitle: 'Ch 2 · Single-lane roundabout. Yield, take the 2nd exit',
    objective: 'Yield on entry. Exit clean. No lane crosses',
    flavor: 'roundabout', chapter: 2, stageNumber: 6,
    speedLimit: 25, length: 7500, obstacleGap: 340, parScore: 950,
    features: ['stopSign', 'trafficLight', 'checkpoint', 'star', 'pedestrian'], shoulderColor: 0x3c5a34,
  }),
  build({
    id: 'yield-master', name: 'Yield Master', subtitle: 'Ch 2 · Busier entries — read the gap, yield right',
    objective: 'Yield cleanly through 3 checkpoints. No collisions',
    flavor: 'roundabout', chapter: 2, stageNumber: 7,
    speedLimit: 30, length: 8500, obstacleGap: 300, parScore: 1100,
    features: ['stopSign', 'trafficLight', 'traffic', 'checkpoint', 'star', 'pedestrian'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'double-trouble', name: 'Double Trouble', subtitle: 'Ch 2 · Two-lane roundabout. Correct lane = later exit',
    objective: 'Hold your lane through the circle. Don\'t drift',
    flavor: 'roundabout', chapter: 2, stageNumber: 8,
    speedLimit: 30, length: 9000, obstacleGap: 280, parScore: 1200,
    features: ['stopSign', 'trafficLight', 'traffic', 'cone', 'checkpoint', 'star'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'spiral-rush', name: 'Spiral Rush', subtitle: 'Ch 2 · Consecutive roundabouts. String them together',
    objective: 'Chain 4 circles without a fault',
    flavor: 'roundabout', chapter: 2, stageNumber: 9,
    speedLimit: 35, length: 10000, obstacleGap: 270, parScore: 1350,
    features: ['stopSign', 'trafficLight', 'traffic', 'cone', 'checkpoint', 'star', 'pedestrian'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'roundabout-gauntlet', name: 'Roundabout Gauntlet', subtitle: 'Ch 2 · High density, zero violations for 3★',
    objective: '3★ requires a fully clean run — no crashes, no ran-signs',
    flavor: 'roundabout', chapter: 2, stageNumber: 10,
    speedLimit: 35, length: 11000, obstacleGap: 240, parScore: 1500,
    features: ['stopSign', 'trafficLight', 'traffic', 'cone', 'parkedCar', 'checkpoint', 'star', 'pedestrian'],
    shoulderColor: 0x2c3a44,
  }),

  // ============== CH3 CITY PRESSURE ==============
  build({
    id: 'downtown-delivery', name: 'Downtown Delivery', subtitle: 'Ch 3 · Multi-stop route through downtown',
    objective: 'Hit every checkpoint. Watch parked cars',
    flavor: 'city', chapter: 3, stageNumber: 11,
    speedLimit: 30, length: 9500, obstacleGap: 300, parScore: 1200,
    features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'checkpoint', 'star', 'pedestrian'],
    shoulderColor: 0x35414a,
  }),
  build({
    id: 'rush-hour-squeeze', name: 'Rush Hour Squeeze', subtitle: 'Ch 3 · Dense traffic. Lane changes required',
    objective: 'Weave the traffic. No collisions for 3★',
    flavor: 'city', chapter: 3, stageNumber: 12,
    speedLimit: 40, length: 10000, obstacleGap: 250, parScore: 1400,
    features: ['traffic', 'trafficLight', 'cone', 'checkpoint', 'star'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'door-zone', name: 'Door Zone', subtitle: 'Ch 3 · Parked cars everywhere. Give them space',
    objective: 'Stay clear of the door zone. No parked-car crashes',
    flavor: 'parked', chapter: 3, stageNumber: 13,
    speedLimit: 30, length: 9000, obstacleGap: 260, parScore: 1250,
    features: ['parkedCar', 'cone', 'stopSign', 'checkpoint', 'star', 'pedestrian'], shoulderColor: 0x3c5a34,
  }),
  build({
    id: 'bus-lane-blues', name: 'Bus Lane Blues', subtitle: 'Ch 3 · Buses stopping, delivery vans blocking',
    objective: 'Merge around stopped traffic without a scrape',
    flavor: 'bus', chapter: 3, stageNumber: 14,
    speedLimit: 30, length: 9500, obstacleGap: 260, parScore: 1300,
    features: ['parkedCar', 'traffic', 'stopSign', 'cone', 'checkpoint', 'star', 'pedestrian'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'school-zone', name: 'School Zone', subtitle: 'Ch 3 · 25 mph, kids about. Harsh speeding penalties',
    objective: 'Hold 25. Every kid safely across. 3★ = zero speed flags',
    flavor: 'schoolzone', chapter: 3, stageNumber: 15,
    speedLimit: 25, length: 9000, obstacleGap: 260, parScore: 1300,
    features: ['cone', 'stopSign', 'parkedCar', 'pedestrian', 'checkpoint', 'star'], shoulderColor: 0x4f6a3d,
  }),

  // ============== CH4 SPLIT-SECOND ==============
  build({
    id: 'quick-turns', name: 'Quick Turns Gauntlet', subtitle: 'Ch 4 · Rapid arrow-called turns. React fast',
    objective: 'Nail the turn sequence. No lane crosses',
    flavor: 'turns', chapter: 4, stageNumber: 16,
    speedLimit: 35, length: 9500, obstacleGap: 240, parScore: 1400,
    features: ['cone', 'trafficLight', 'stopSign', 'traffic', 'checkpoint', 'star'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'merge-master', name: 'Merge Master', subtitle: 'Ch 4 · Highway on-ramps. Match speed. Merge clean',
    objective: 'Reach highway speed and merge without cutting off traffic',
    flavor: 'merge', chapter: 4, stageNumber: 17,
    speedLimit: 55, length: 10500, obstacleGap: 320, parScore: 1400,
    features: ['traffic', 'cone', 'checkpoint', 'star'], shoulderColor: 0x4a4a50,
  }),
  build({
    id: 'green-light-sprint', name: 'Green Light Sprint', subtitle: 'Ch 4 · Time the lights. Keep the green rolling',
    objective: 'Ride the green wave. Every red light hurts your rating',
    flavor: 'lights', chapter: 4, stageNumber: 18,
    speedLimit: 40, length: 10000, obstacleGap: 280, parScore: 1500,
    features: ['trafficLight', 'traffic', 'cone', 'checkpoint', 'star'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'make-way', name: 'Make Way', subtitle: 'Ch 4 · Emergency vehicles approach. Pull over correctly',
    objective: 'Yield to sirens. Return to lane cleanly',
    flavor: 'emergency', chapter: 4, stageNumber: 19,
    speedLimit: 40, length: 10000, obstacleGap: 260, parScore: 1500,
    features: ['traffic', 'trafficLight', 'stopSign', 'cone', 'checkpoint', 'star', 'pedestrian'], shoulderColor: 0x35414a,
  }),
  build({
    id: 'precision-park', name: 'Precision Park', subtitle: 'Ch 4 · Threaded corridors, tight parking targets',
    objective: 'Thread every gap. Hit every checkpoint',
    flavor: 'parking', chapter: 4, stageNumber: 20,
    speedLimit: 25, length: 9500, obstacleGap: 200, parScore: 1400,
    features: ['cone', 'parkedCar', 'stopSign', 'checkpoint', 'star'], shoulderColor: 0x5a4a32,
  }),

  // ============== CH5 MASTERY ==============
  build({
    id: 'multitask-mayhem', name: 'Multitask Mayhem', subtitle: 'Ch 5 · Roundabouts + peds + signals all at once',
    objective: 'Everything, everywhere. Prove you can handle it all',
    flavor: 'mastery', chapter: 5, stageNumber: 21,
    speedLimit: 40, length: 11500, obstacleGap: 240, parScore: 1650,
    features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'pedestrian', 'checkpoint', 'star'],
    shoulderColor: 0x35414a,
  }),
  build({
    id: 'storm-run', name: 'Storm Run', subtitle: 'Ch 5 · Rain and reduced visibility. Take it slow',
    objective: 'Adapt to the storm. No skidding into anything',
    flavor: 'storm', chapter: 5, stageNumber: 22,
    speedLimit: 35, length: 11500, obstacleGap: 260, parScore: 1650,
    features: ['cone', 'stopSign', 'parkedCar', 'traffic', 'pedestrian', 'checkpoint', 'star'],
    shoulderColor: 0x1b2430, nightAlpha: 0.24,
  }),
  build({
    id: 'the-examiner', name: 'The Examiner', subtitle: 'Ch 5 · Full simulated road test. Strict scoring',
    objective: 'Real road-test discipline. 3★ = examiner-clean run',
    flavor: 'exam', chapter: 5, stageNumber: 23,
    speedLimit: 45, length: 13000, obstacleGap: 240, parScore: 1900,
    features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'pedestrian', 'checkpoint', 'star'],
    shoulderColor: 0x2c3a44, nightAlpha: 0.14,
  }),
  build({
    id: 'endless-city', name: 'Endless City', subtitle: 'Ch 5 · Endless mode. Escalating everything',
    objective: 'How far can you go? 3 crashes and you\'re out',
    flavor: 'endless', chapter: 5, stageNumber: 24,
    speedLimit: 45, maxSpeed: 65, length: 999999, obstacleGap: 260, parScore: 2000,
    features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'pedestrian', 'star'],
    shoulderColor: 0x2c3a44, endless: true,
  }),
];

/** Deterministic daily-challenge generator: seeded by today's YYYY-MM-DD (America/New_York).
 *  Same seed → same stage layout for everyone that day. */
function todayKey(): string {
  const now = new Date();
  const nyc = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return nyc; // YYYY-MM-DD
}

function seededInt(seed: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

function buildDaily(): LevelConfig {
  const key = todayKey();
  const themes: Array<{ label: string; speedLimit: number; night?: number; features: ObstacleType[] }> = [
    { label: 'Night Rush', speedLimit: 40, night: 0.3, features: ['cone', 'trafficLight', 'traffic', 'pedestrian', 'checkpoint', 'star'] },
    { label: 'School Zone Shuffle', speedLimit: 25, features: ['cone', 'stopSign', 'parkedCar', 'pedestrian', 'checkpoint', 'star'] },
    { label: 'Roundabout Relay', speedLimit: 35, features: ['trafficLight', 'stopSign', 'traffic', 'pedestrian', 'checkpoint', 'star'] },
    { label: 'Downtown Density', speedLimit: 30, features: ['cone', 'trafficLight', 'parkedCar', 'traffic', 'pedestrian', 'checkpoint', 'star'] },
    { label: 'Highway Hustle', speedLimit: 55, features: ['traffic', 'cone', 'checkpoint', 'star'] },
    { label: 'Storm Rally', speedLimit: 35, night: 0.22, features: ['cone', 'parkedCar', 'traffic', 'pedestrian', 'checkpoint', 'star'] },
    { label: 'Examiner\'s Special', speedLimit: 45, features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'pedestrian', 'checkpoint', 'star'] },
  ];
  const theme = themes[seededInt(key, themes.length)];
  const gap = 230 + seededInt(key + 'g', 90);
  const length = 9500 + seededInt(key + 'l', 3500);
  const par = 1400 + seededInt(key + 'p', 500);
  return build({
    id: 'daily-challenge', name: 'Daily Challenge', subtitle: `NEW · ${theme.label} · Today only (${key})`,
    objective: 'A fresh route every day. Come back tomorrow for a new one',
    flavor: 'daily', chapter: 5, stageNumber: 25, isDaily: true,
    speedLimit: theme.speedLimit, length, obstacleGap: gap, parScore: par,
    features: theme.features, shoulderColor: 0x2c3a44, nightAlpha: theme.night,
  });
}

export const LEVELS: LevelConfig[] = [...STAGES, buildDaily()];

export function getLevel(id: string): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function levelsByChapter(): Record<1 | 2 | 3 | 4 | 5, LevelConfig[]> {
  const grouped: Record<1 | 2 | 3 | 4 | 5, LevelConfig[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const lvl of LEVELS) {
    if (lvl.chapter) grouped[lvl.chapter].push(lvl);
  }
  return grouped;
}
