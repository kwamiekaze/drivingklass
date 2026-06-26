import { useMemo } from "react";

export interface TimeSplitEntry {
  key: string;
  label: string;
  minutes: number;
}

export const TIME_SPLIT_CATEGORIES: { key: string; label: string }[] = [
  { key: 'parking_lot', label: 'Parking Lot' },
  { key: 'subdivision', label: 'Subdivision' },
  { key: 'city', label: 'City' },
  { key: 'backroads', label: 'Backroads' },
  { key: 'interstate', label: 'Interstate' },
];

const COLORS: Record<string, string> = {
  parking_lot: '#a78bfa',
  subdivision: '#60a5fa',
  city: '#fbbf24',
  backroads: '#34d399',
  interstate: '#f97316',
};

interface Props {
  entries?: TimeSplitEntry[] | null;
  className?: string;
}

export function TimeSplitChart({ entries, className }: Props) {
  const valid = useMemo(
    () => (entries || []).filter(e => e && e.minutes > 0),
    [entries]
  );
  const total = valid.reduce((a, b) => a + b.minutes, 0);
  if (!valid.length || total <= 0) return null;

  // Largest-remainder rounding so percentages sum to exactly 100
  const raw = valid.map(e => ({ ...e, exact: (e.minutes / total) * 100 }));
  const floored = raw.map(e => ({ ...e, pct: Math.floor(e.exact), remainder: e.exact - Math.floor(e.exact) }));
  let remaining = 100 - floored.reduce((a, b) => a + b.pct, 0);
  const order = [...floored].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < order.length && remaining > 0; i++, remaining--) order[i].pct += 1;
  const pctByKey: Record<string, number> = {};
  floored.forEach(e => { pctByKey[e.key] = e.pct; });

  const lastIdx = valid.length - 1;
  return (
    <div className={className}>
      <div className="flex w-full h-6 rounded-full overflow-hidden border border-border/60">
        {valid.map((e, i) => (
          <div
            key={e.key}
            className={i === lastIdx ? 'flex-1' : 'shrink-0'}
            style={
              i === lastIdx
                ? { background: COLORS[e.key] || '#888' }
                : { width: `${pctByKey[e.key]}%`, background: COLORS[e.key] || '#888' }
            }
            title={`${e.label}: ${e.minutes} min (${pctByKey[e.key]}%)`}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {valid.map(e => (
          <div key={e.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[e.key] || '#888' }} />
            <span className="text-foreground truncate">{e.label}</span>
            <span className="ml-auto text-muted-foreground">{e.minutes}m · {pctByKey[e.key]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
