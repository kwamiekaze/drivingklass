/** Render budget for the current device. Everything heavy in the world reads from here. */
export type Quality = {
  tier: 'high' | 'mid' | 'lite';
  reflective: boolean; lite: boolean;
  grass: number; trees: number; clumps: number;
  shadow: number; dpr: [number, number];
};

const T: Record<Quality['tier'], Quality> = {
  high: { tier: 'high', reflective: true, lite: false, grass: 18000, trees: 34, clumps: 38, shadow: 2048, dpr: [1, 1.6] },
  mid: { tier: 'mid', reflective: false, lite: false, grass: 6500, trees: 22, clumps: 24, shadow: 1024, dpr: [1, 1.4] },
  lite: { tier: 'lite', reflective: false, lite: true, grass: 2600, trees: 14, clumps: 16, shadow: 0, dpr: [1, 1] },
};

export function qualityFor(tier: Quality['tier']) { return T[tier]; }

/** Pick a starting tier from width, cores and memory. PerformanceMonitor steps it down further if frames drop. */
export function detectTier(): Quality['tier'] {
  if (typeof window === 'undefined') return 'mid';
  const forced = new URLSearchParams(window.location.search).get('tier');
  if (forced === 'high' || forced === 'mid' || forced === 'lite') return forced;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency ?? 4, mem = nav.deviceMemory ?? 4;
  const small = window.innerWidth < 900, saver = !!nav.connection?.saveData;
  if (saver || mem <= 2 || cores <= 2) return 'lite';
  if (small) return cores <= 4 || mem <= 3 ? 'lite' : 'mid';
  return cores <= 4 ? 'mid' : 'high';
}

export function stepDown(t: Quality['tier']): Quality['tier'] { return t === 'high' ? 'mid' : 'lite'; }
