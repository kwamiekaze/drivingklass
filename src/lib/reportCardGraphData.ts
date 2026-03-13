import { RATING_CATEGORIES } from "@/types/portal";

// Skill keys excluding 'overall'
export const SKILL_KEYS = RATING_CATEGORIES
  .filter(c => c.key !== 'overall')
  .map(c => c.key);

export const SKILL_LABELS: Record<string, string> = Object.fromEntries(
  RATING_CATEGORIES.filter(c => c.key !== 'overall').map(c => [c.key, c.label])
);

export interface ReportCardRatings {
  id: string;
  created_at: string;
  [key: string]: number | string | null | undefined;
}

export interface RadarDataPoint {
  skill: string;
  label: string;
  first: number;
  average: number;
  latest: number;
}

export interface TrendDataPoint {
  index: number;
  label: string;
  overall: number;
  date: string;
}

export interface ProgressInsights {
  totalReports: number;
  overallAverage: number;
  strongestSkill: string;
  focusArea: string;
  mostImproved: string;
  mostImprovedGain: number;
}

/**
 * Determines if a rating value should be treated as "not covered" / placeholder.
 * We treat null/undefined as not covered. We do NOT exclude low values by default
 * since instructors may legitimately rate a skill as 1.
 */
function isRated(val: unknown): val is number {
  return typeof val === 'number' && val >= 1 && val <= 10;
}

/**
 * Compute radar chart data from an array of report cards.
 * Returns { first, average, latest } for each skill.
 */
export function computeRadarData(reports: ReportCardRatings[]): RadarDataPoint[] {
  if (reports.length === 0) return [];

  const sorted = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  return SKILL_KEYS.map(key => {
    // Compute average excluding unrated
    const rated = sorted
      .map(r => r[key])
      .filter(isRated);
    const avg = rated.length > 0
      ? Math.round((rated.reduce((s, v) => s + v, 0) / rated.length) * 10) / 10
      : 0;

    return {
      skill: key,
      label: SKILL_LABELS[key] || key,
      first: isRated(first[key]) ? first[key] : 0,
      average: avg,
      latest: isRated(latest[key]) ? latest[key] : 0,
    };
  });
}

/**
 * Compute trend data (overall score per report over time).
 */
export function computeTrendData(reports: ReportCardRatings[]): TrendDataPoint[] {
  const sorted = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return sorted.map((r, i) => ({
    index: i + 1,
    label: `#${i + 1}`,
    overall: isRated(r.overall) ? r.overall : 0,
    date: r.created_at,
  }));
}

/**
 * Compute insight summary cards.
 */
export function computeInsights(reports: ReportCardRatings[]): ProgressInsights {
  if (reports.length === 0) {
    return {
      totalReports: 0,
      overallAverage: 0,
      strongestSkill: '—',
      focusArea: '—',
      mostImproved: '—',
      mostImprovedGain: 0,
    };
  }

  const sorted = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Overall average
  const overalls = sorted.map(r => r.overall).filter(isRated);
  const overallAverage = overalls.length > 0
    ? Math.round((overalls.reduce((s, v) => s + v, 0) / overalls.length) * 10) / 10
    : 0;

  // Per-skill averages
  const skillAverages: Record<string, number> = {};
  SKILL_KEYS.forEach(key => {
    const vals = sorted.map(r => r[key]).filter(isRated);
    skillAverages[key] = vals.length > 0
      ? vals.reduce((s, v) => s + v, 0) / vals.length
      : 0;
  });

  // Strongest skill
  let strongestKey = SKILL_KEYS[0];
  let strongestVal = 0;
  let weakestKey = SKILL_KEYS[0];
  let weakestVal = 11;

  SKILL_KEYS.forEach(key => {
    if (skillAverages[key] > strongestVal) {
      strongestVal = skillAverages[key];
      strongestKey = key;
    }
    if (skillAverages[key] < weakestVal && skillAverages[key] > 0) {
      weakestVal = skillAverages[key];
      weakestKey = key;
    }
  });

  // Most improved (first → latest)
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  let bestGainKey = SKILL_KEYS[0];
  let bestGain = -Infinity;

  SKILL_KEYS.forEach(key => {
    const fv = isRated(first[key]) ? (first[key] as number) : 0;
    const lv = isRated(latest[key]) ? (latest[key] as number) : 0;
    const gain = lv - fv;
    if (gain > bestGain) {
      bestGain = gain;
      bestGainKey = key;
    }
  });

  return {
    totalReports: reports.length,
    overallAverage,
    strongestSkill: SKILL_LABELS[strongestKey] || strongestKey,
    focusArea: SKILL_LABELS[weakestKey] || weakestKey,
    mostImproved: SKILL_LABELS[bestGainKey] || bestGainKey,
    mostImprovedGain: Math.max(bestGain, 0),
  };
}
