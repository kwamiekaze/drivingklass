/** Local star-rating + unlock progression for the Road Test Challenge.
 *  Persisted client-side; complements the server-side leaderboard scores. */

import { LEVELS } from './game/levels';
import type { LevelConfig, LevelResult } from './game/types';

const STARS_KEY = 'dk-game-stars-v1';

type StarMap = Record<string, 0 | 1 | 2 | 3>;

function read(): StarMap {
  try {
    const raw = localStorage.getItem(STARS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StarMap;
  } catch {
    return {};
  }
}

function write(map: StarMap) {
  try { localStorage.setItem(STARS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function getStarMap(): StarMap {
  return read();
}

export function getStars(levelId: string): 0 | 1 | 2 | 3 {
  return read()[levelId] ?? 0;
}

/** Only upgrade — never overwrite a better run with a worse one. */
export function saveStars(levelId: string, stars: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  const map = read();
  const prev = map[levelId] ?? 0;
  if (stars > prev) {
    map[levelId] = stars;
    write(map);
    return stars;
  }
  return prev;
}

export function starsFromResult(level: LevelConfig, result: LevelResult): 0 | 1 | 2 | 3 {
  if (!result.passed) return 0;
  const t = level.starThresholds;
  if (!t) return result.passed ? 1 : 0;
  const [s1, s2, s3] = t;
  if (result.score >= s3) return 3;
  if (result.score >= s2) return 2;
  if (result.score >= s1) return 1;
  return 0;
}

/** Unlock rule: a stage is unlocked if the previous stage in the same
 *  chapter numbering has ≥1 star. Stage 1 & the daily challenge are always open. */
export function isUnlocked(levelId: string): boolean {
  const lvl = LEVELS.find((l) => l.id === levelId);
  if (!lvl || !lvl.stageNumber) return true;
  if (lvl.isDaily) return true;
  if (lvl.stageNumber === 1) return true;
  const prev = LEVELS.find((l) => l.stageNumber === lvl.stageNumber! - 1);
  if (!prev) return true;
  return getStars(prev.id) >= 1;
}

export function totalStars(): number {
  const map = read();
  return Object.values(map).reduce<number>((s, n) => s + (n ?? 0), 0);
}

export function chapterStars(chapter: 1 | 2 | 3 | 4 | 5): { earned: number; max: number } {
  const map = read();
  const stages = LEVELS.filter((l) => l.chapter === chapter);
  const max = stages.length * 3;
  const earned = stages.reduce<number>((s, l) => s + (map[l.id] ?? 0), 0);
  return { earned, max };
}
