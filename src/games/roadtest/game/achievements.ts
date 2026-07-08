/** Achievements — localStorage badges with counter progress. */

export interface Achievement {
  id: string;
  label: string;
  hint: string;
  goal: number;         // when counter >= goal → unlocked
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-star',        label: 'First Star',           hint: 'Collect your first gold star',            goal: 1,    icon: '⭐' },
  { id: 'star-hoarder',      label: 'Star Hoarder',         hint: 'Collect 500 stars total',                 goal: 500,  icon: '🌟' },
  { id: 'combo-5',           label: 'Combo x5',             hint: 'Reach a 5x combo in one run',             goal: 5,    icon: '🔗' },
  { id: 'combo-10',          label: 'Combo x10',            hint: 'Reach a 10x combo in one run',            goal: 10,   icon: '⛓️' },
  { id: 'dog-whisperer',     label: 'Dog Whisperer',        hint: 'Safely dodge 25 runaway dogs',            goal: 25,   icon: '🐕' },
  { id: 'guardian-angel',    label: 'Guardian Angel',       hint: '50 safe pedestrian passes',               goal: 50,   icon: '🛡️' },
  { id: 'night-owl',         label: 'Night Owl',            hint: 'Finish a night-time level',               goal: 1,    icon: '🌙' },
  { id: 'storm-rider',       label: 'Storm Rider',          hint: 'Finish a weather-tinted level',           goal: 1,    icon: '🌧️' },
  { id: 'perfect-exam',      label: 'Perfect Exam',         hint: 'Ace the Road Test Final',                 goal: 1,    icon: '🎓' },
  { id: 'marathon',          label: 'Marathon',             hint: 'Endless run past 12,000 distance',        goal: 12000, icon: '🏁' },
  { id: 'social-butterfly',  label: 'Social Butterfly',     hint: 'Play 5 multiplayer matches',              goal: 5,    icon: '🦋' },
  { id: 'daily-3',           label: 'Daily 3-day streak',   hint: 'Play the Daily Challenge 3 days in a row',goal: 3,    icon: '🔥' },
  { id: 'daily-7',           label: 'Daily 7-day streak',   hint: 'Play the Daily Challenge 7 days in a row',goal: 7,    icon: '🔥' },
  { id: 'daily-30',          label: 'Daily 30-day streak',  hint: '30-day Daily Challenge streak',           goal: 30,   icon: '💎' },
  { id: 'first-lesson',      label: 'First Lesson',         hint: 'Complete your first lesson',              goal: 1,    icon: '🚗' },
  { id: 'five-lessons',      label: 'Learner',              hint: 'Complete 5 lessons',                      goal: 5,    icon: '📘' },
  { id: 'ten-lessons',       label: 'Student Driver',       hint: 'Complete 10 lessons',                     goal: 10,   icon: '📗' },
  { id: 'twenty-lessons',    label: 'Road Warrior',         hint: 'Complete 20 lessons',                     goal: 20,   icon: '📕' },
  { id: 'no-crash',          label: 'Clean Sheet',          hint: 'Finish a lesson without a single crash',  goal: 1,    icon: '✨' },
  { id: 'endless-10k',       label: 'Endless 10K',          hint: 'Score 10,000+ in Endless',                goal: 10000, icon: '♾️' },
  { id: 'endless-25k',       label: 'Endless 25K',          hint: 'Score 25,000+ in Endless',                goal: 25000, icon: '♾️' },
  { id: 'daily-champ',       label: 'Daily Champ',          hint: 'Beat the Daily Challenge par',            goal: 1,    icon: '🏆' },
  { id: 'rank-gold',         label: 'Gold Wheel',           hint: 'Reach the Gold Wheel rank',               goal: 1,    icon: '🥇' },
  { id: 'rank-legend',       label: 'DK Legend',            hint: 'Reach the DrivingKlass Legend rank',      goal: 1,    icon: '👑' },
];

const ACH_KEY = 'dk-achievements-v1';

type State = Record<string, { count: number; unlocked: boolean; unlockedAt?: string }>;

function load(): State {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}
function save(s: State) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function getAchievementState(): State { return load(); }

export function isUnlocked(id: string): boolean {
  return !!load()[id]?.unlocked;
}

/** Increment counter for one achievement; returns newly-unlocked achievement or null. */
export function bumpAchievement(id: string, by = 1): Achievement | null {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return null;
  const s = load();
  const cur = s[id] ?? { count: 0, unlocked: false };
  if (cur.unlocked) { save(s); return null; }
  cur.count = Math.min(cur.count + by, def.goal);
  if (cur.count >= def.goal) {
    cur.unlocked = true;
    cur.unlockedAt = new Date().toISOString();
    s[id] = cur;
    save(s);
    return def;
  }
  s[id] = cur;
  save(s);
  return null;
}

/** Set an absolute counter (max-style: only advance forward). */
export function setAchievementCounter(id: string, value: number): Achievement | null {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return null;
  const s = load();
  const cur = s[id] ?? { count: 0, unlocked: false };
  if (cur.unlocked) return null;
  if (value <= cur.count) return null;
  cur.count = Math.min(value, def.goal);
  if (cur.count >= def.goal) {
    cur.unlocked = true;
    cur.unlockedAt = new Date().toISOString();
    s[id] = cur;
    save(s);
    return def;
  }
  s[id] = cur;
  save(s);
  return null;
}
