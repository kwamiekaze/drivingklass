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
 * Coerce a raw DB value to a numeric rating.
 * Handles strings, floats, nulls safely.
 */
function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Determines if a rating value should be treated as "not covered" / placeholder.
 */
function isRated(val: unknown): val is number {
  const n = toNumber(val);
  return n !== null && n >= 1 && n <= 10;
}

/** Safe accessor: always returns the numeric value for a skill key, or 0. */
function safeRating(report: ReportCardRatings, key: string): number {
  const n = toNumber(report[key]);
  return (n !== null && n >= 1 && n <= 10) ? n : 0;
}

/**
 * Compute radar chart data from an array of report cards.
 * Returns { first, average, latest } for each skill.
 * Uses SKILL_KEYS (canonical order from RATING_CATEGORIES) as single source of truth.
 */
export function computeRadarData(reports: ReportCardRatings[]): RadarDataPoint[] {
  if (reports.length === 0) return [];

  const sorted = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  const result = SKILL_KEYS.map(key => {
    // Compute average excluding unrated, using safe number coercion
    const ratedValues: number[] = [];
    for (const r of sorted) {
      const n = toNumber(r[key]);
      if (n !== null && n >= 1 && n <= 10) ratedValues.push(n);
    }
    const avg = ratedValues.length > 0
      ? Math.round((ratedValues.reduce((s, v) => s + v, 0) / ratedValues.length) * 10) / 10
      : 0;

    return {
      skill: key,
      label: SKILL_LABELS[key] || key,
      first: safeRating(first, key),
      average: avg,
      latest: safeRating(latest, key),
    };
  });

  // Debug: log data pipeline for verification (remove after confirming fix)
  if (typeof window !== 'undefined' && (window as any).__DEBUG_RADAR) {
    console.log('[RadarData] reports count:', sorted.length);
    console.log('[RadarData] latest report id:', latest.id);
    console.log('[RadarData] latest raw values:', SKILL_KEYS.map(k => ({ key: k, raw: latest[k], safe: safeRating(latest, k) })));
    console.log('[RadarData] result:', result);
  }

  return result;
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
    overall: safeRating(r, 'overall'),
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
  const overalls = sorted.map(r => toNumber(r.overall)).filter((n): n is number => n !== null && n >= 1 && n <= 10);
  const overallAverage = overalls.length > 0
    ? Math.round((overalls.reduce((s, v) => s + v, 0) / overalls.length) * 10) / 10
    : 0;

  // Per-skill averages
  const skillAverages: Record<string, number> = {};
  SKILL_KEYS.forEach(key => {
    const vals = sorted.map(r => toNumber(r[key])).filter((n): n is number => n !== null && n >= 1 && n <= 10);
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
    const fv = safeRating(first, key);
    const lv = safeRating(latest, key);
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
