/** Daily Missions — 3 rotating date-seeded mini-goals. */
import { todayKey } from './dailyChallenge';

export interface MissionDef {
  id: string;
  label: string;
  goal: number;
  xp: number;
  metric: 'stars' | 'safePeds' | 'safeDogs' | 'runsCompleted' | 'noCrashRun' | 'combo' | 'distance';
}

const POOL: MissionDef[] = [
  { id: 'stars-40',     label: 'Collect 40 stars',                    goal: 40,   xp: 200, metric: 'stars' },
  { id: 'stars-80',     label: 'Collect 80 stars',                    goal: 80,   xp: 350, metric: 'stars' },
  { id: 'safe-peds-15', label: 'Safely pass 15 pedestrians',          goal: 15,   xp: 250, metric: 'safePeds' },
  { id: 'safe-dogs-5',  label: 'Dodge 5 runaway dogs',                goal: 5,    xp: 200, metric: 'safeDogs' },
  { id: 'runs-3',       label: 'Complete 3 lessons',                  goal: 3,    xp: 300, metric: 'runsCompleted' },
  { id: 'clean-run',    label: 'Finish a lesson with no crashes',     goal: 1,    xp: 300, metric: 'noCrashRun' },
  { id: 'combo-6',      label: 'Hit a 6x combo',                      goal: 6,    xp: 250, metric: 'combo' },
  { id: 'distance-8k',  label: 'Drive 8,000 in Endless',              goal: 8000, xp: 300, metric: 'distance' },
];

function hashStr(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function pickToday(day: string): MissionDef[] {
  const h = hashStr('dk-missions-' + day);
  const idx = [h % POOL.length, (h >>> 8) % POOL.length, (h >>> 16) % POOL.length];
  const chosen: MissionDef[] = [];
  const used = new Set<number>();
  let i = 0;
  for (const p of idx) {
    let k = p;
    while (used.has(k)) k = (k + 1) % POOL.length;
    used.add(k);
    chosen.push(POOL[k]);
    i++;
    if (i >= 3) break;
  }
  return chosen;
}

const KEY = 'dk-missions-state-v1';

interface MissionsState {
  day: string;
  progress: Record<string, number>;
  completed: string[];
}

function load(): MissionsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { day: todayKey(), progress: {}, completed: [] };
}
function save(s: MissionsState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function getTodaysMissions(): { defs: MissionDef[]; progress: Record<string, number>; completed: Set<string> } {
  const day = todayKey();
  let s = load();
  if (s.day !== day) { s = { day, progress: {}, completed: [] }; save(s); }
  const defs = pickToday(day);
  return { defs, progress: s.progress, completed: new Set(s.completed) };
}

/** Advance a metric, return newly-completed mission ids (with xp). */
export function bumpMissionMetric(metric: MissionDef['metric'], by = 1): { id: string; xp: number; label: string }[] {
  const { defs, progress, completed } = getTodaysMissions();
  const newlyDone: { id: string; xp: number; label: string }[] = [];
  const s = load();
  for (const d of defs) {
    if (d.metric !== metric) continue;
    if (completed.has(d.id)) continue;
    const cur = (progress[d.id] ?? 0) + by;
    s.progress[d.id] = Math.min(cur, d.goal);
    if (cur >= d.goal) {
      s.completed.push(d.id);
      newlyDone.push({ id: d.id, xp: d.xp, label: d.label });
    }
  }
  save(s);
  return newlyDone;
}
