import { describe, it, expect } from 'vitest';
import {
  compareByEffectiveAddedDesc, effectiveAddedDate, effectiveAddedValue,
  parseCalendarDate, sortByEffectiveAddedDesc,
} from '@/lib/leadDates';

const imported = { id: 'a', created_at: '2026-01-05T10:00:00Z', start_date: '2025-03-14', import_source: 'imported_student_roster' };
const manual = { id: 'b', created_at: '2026-02-01T10:00:00Z', start_date: null, import_source: null };
const importedNoStart = { id: 'c', created_at: '2026-01-05T10:00:00Z', start_date: null, import_source: 'imported_student_roster' };

describe('effective added date', () => {
  it('imported lead uses start_date', () => {
    expect(effectiveAddedValue(imported)).toBe('2025-03-14');
  });
  it('manual lead uses created_at', () => {
    expect(effectiveAddedValue(manual)).toBe(manual.created_at);
  });
  it('missing start_date falls back to created_at', () => {
    expect(effectiveAddedValue(importedNoStart)).toBe(importedNoStart.created_at);
  });
  it('parses YYYY-MM-DD as local calendar day', () => {
    const d = parseCalendarDate('2025-03-14');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(14);
    expect(effectiveAddedDate(imported).getDate()).toBe(14);
  });
  it('sorts newest effective date first', () => {
    const sorted = sortByEffectiveAddedDesc([imported, manual, importedNoStart]);
    expect(sorted.map((l) => l.id)).toEqual(['b', 'c', 'a']);
  });
  it('breaks ties deterministically by created_at then id', () => {
    const x = { id: 'z', created_at: '2026-01-05T10:00:00Z', start_date: '2025-03-14', import_source: 'roster' };
    const y = { id: 'a', created_at: '2026-01-05T10:00:00Z', start_date: '2025-03-14', import_source: 'roster' };
    expect(compareByEffectiveAddedDesc(x, y)).toBeGreaterThan(0);
    expect(compareByEffectiveAddedDesc(y, x)).toBeLessThan(0);
  });
});
