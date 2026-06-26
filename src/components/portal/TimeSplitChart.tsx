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

  return (
    <div className={className}>
      <div className="flex w-full h-6 rounded-full overflow-hidden border border-border/60">
        {valid.map(e => {
          const pct = (e.minutes / total) * 100;
          return (
            <div
              key={e.key}
              style={{ width: `${pct}%`, background: COLORS[e.key] || '#888' }}
              title={`${e.label}: ${e.minutes} min (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {valid.map(e => {
          const pct = (e.minutes / total) * 100;
          return (
            <div key={e.key} className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[e.key] || '#888' }} />
              <span className="text-foreground truncate">{e.label}</span>
              <span className="ml-auto text-muted-foreground">{e.minutes}m · {Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
