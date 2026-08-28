import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS, IMPORTED_BADGE, buildSearchParams, describeFilters, filtersAreDefault,
  inStartRange, studentSortKey, type LeadFilterState,
} from '@/lib/leadFilters';

const withFilters = (p: Partial<LeadFilterState>): LeadFilterState => ({ ...DEFAULT_FILTERS, ...p });

describe('source start-date range', () => {
  it('is inclusive on both bounds', () => {
    expect(inStartRange('2026-03-01', '2026-03-01', '2026-03-31')).toBe(true);
    expect(inStartRange('2026-03-31', '2026-03-01', '2026-03-31')).toBe(true);
    expect(inStartRange('2026-02-28', '2026-03-01', '2026-03-31')).toBe(false);
    expect(inStartRange('2026-04-01', '2026-03-01', '2026-03-31')).toBe(false);
  });

  it('supports open-ended bounds and excludes rows with no start date', () => {
    expect(inStartRange('2026-01-01', null, null)).toBe(true);
    expect(inStartRange(null, null, null)).toBe(true);
    expect(inStartRange(null, '2026-01-01', null)).toBe(false);
    expect(inStartRange('2026-01-01', '2026-01-01', null)).toBe(true);
    expect(inStartRange('2026-01-01', null, '2025-12-31')).toBe(false);
  });
});

describe('combined filters map to RPC params', () => {
  it('sends every filter server-side with paging', () => {
    const params = buildSearchParams(
      withFilters({
        search: '  Smith ', source: 'imported', sort: 'student_name', dir: 'asc',
        startFrom: '2026-01-01', startTo: '2026-06-30', status: 'Active', zone: 'North',
      }),
      2,
      50,
    );
    expect(params).toEqual({
      p_search: 'Smith',
      p_source: 'imported',
      p_sort: 'student_name',
      p_dir: 'asc',
      p_limit: 50,
      p_offset: 100,
      p_start_from: '2026-01-01',
      p_start_to: '2026-06-30',
      p_status: 'Active',
      p_zone: 'North',
    });
  });

  it('nulls out empty filters and the "all" source', () => {
    const params = buildSearchParams(withFilters({ source: 'all' }), 0, 50);
    expect(params.p_source).toBeNull();
    expect(params.p_search).toBeNull();
    expect(params.p_start_from).toBeNull();
    expect(params.p_start_to).toBeNull();
    expect(params.p_status).toBeNull();
    expect(params.p_zone).toBeNull();
  });

  it('defaults to source start date, newest first', () => {
    const params = buildSearchParams(DEFAULT_FILTERS, 0, 50);
    expect(params.p_sort).toBe('default');
    expect(params.p_dir).toBe('desc');
  });
});

describe('student name sorting', () => {
  it('orders by last name then first name, case-insensitively', () => {
    const rows = [
      { first: 'zoe', last: 'Adams' },
      { first: 'Aaron', last: 'baker' },
      { first: 'Bea', last: 'Adams' },
    ];
    const sorted = [...rows].sort((a, b) =>
      studentSortKey(a.first, a.last).localeCompare(studentSortKey(b.first, b.last)));
    expect(sorted.map((r) => `${r.first} ${r.last}`)).toEqual(['Bea Adams', 'zoe Adams', 'Aaron baker']);
  });

  it('falls back to the full name when parts are missing', () => {
    expect(studentSortKey(null, null, 'Casey Jones')).toBe('casey jones');
  });
});

describe('filter summary and reset', () => {
  it('summarises active filters compactly and neutrally', () => {
    const s = describeFilters(withFilters({
      search: 'jones', startFrom: '2026-01-01', startTo: '2026-02-01', status: 'Active', zone: 'North',
    }));
    expect(s).toEqual([
      'Search: "jones"',
      'Imported roster only',
      'Source start date 2026-01-01 → 2026-02-01',
      'Status: Active',
      'Zone: North',
    ]);
    expect(s.join(' ')).not.toMatch(/drivescout/i);
  });

  it('reports one-sided ranges', () => {
    expect(describeFilters(withFilters({ startFrom: '2026-01-01' })))
      .toContain('Source start date from 2026-01-01');
    expect(describeFilters(withFilters({ startTo: '2026-01-01' })))
      .toContain('Source start date to 2026-01-01');
  });

  it('detects the reset (default) state', () => {
    expect(filtersAreDefault(DEFAULT_FILTERS)).toBe(true);
    expect(filtersAreDefault(withFilters({ startFrom: '2026-01-01' }))).toBe(false);
    expect(filtersAreDefault(withFilters({ zone: 'North' }))).toBe(false);
    expect(filtersAreDefault(withFilters({ sort: 'student_name' }))).toBe(false);
  });

  it('uses a neutral imported badge', () => {
    expect(IMPORTED_BADGE).toBe('Imported roster');
  });
});
