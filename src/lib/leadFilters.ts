// Pure helpers for the Student Leads panel filters.
// Mirrors the server-side behaviour of the admin_search_leads RPC so the
// filter contract can be unit tested without a database round-trip.

export type LeadSortKey =
  | 'default'
  | 'source_index'
  | 'start_date'
  | 'student_name'
  | 'source_account_created_on';

export type LeadSourceFilter = 'all' | 'imported' | 'manual';

export interface LeadFilterState {
  search: string;
  source: LeadSourceFilter;
  sort: LeadSortKey;
  dir: 'asc' | 'desc';
  /** Inclusive lower bound on leads.start_date (source start date), YYYY-MM-DD. */
  startFrom: string;
  /** Inclusive upper bound on leads.start_date (source start date), YYYY-MM-DD. */
  startTo: string;
  status: string;
  zone: string;
}

export const DEFAULT_FILTERS: LeadFilterState = {
  search: '',
  source: 'imported',
  sort: 'default',
  dir: 'desc',
  startFrom: '',
  startTo: '',
  status: '',
  zone: '',
};

/** Neutral label shown for every imported row — never the upstream source value. */
export const IMPORTED_BADGE = 'Imported roster';

export const filtersAreDefault = (f: LeadFilterState): boolean =>
  f.search === DEFAULT_FILTERS.search &&
  f.source === DEFAULT_FILTERS.source &&
  f.sort === DEFAULT_FILTERS.sort &&
  f.dir === DEFAULT_FILTERS.dir &&
  !f.startFrom && !f.startTo && !f.status && !f.zone;

/** Compact human summary of the filters currently narrowing the list. */
export function describeFilters(f: LeadFilterState): string[] {
  const out: string[] = [];
  if (f.search.trim()) out.push(`Search: "${f.search.trim()}"`);
  if (f.source === 'imported') out.push('Imported roster only');
  if (f.source === 'manual') out.push('Manually added only');
  if (f.startFrom && f.startTo) out.push(`Source start date ${f.startFrom} → ${f.startTo}`);
  else if (f.startFrom) out.push(`Source start date from ${f.startFrom}`);
  else if (f.startTo) out.push(`Source start date to ${f.startTo}`);
  if (f.status) out.push(`Status: ${f.status}`);
  if (f.zone) out.push(`Zone: ${f.zone}`);
  return out;
}

export interface LeadSearchParams {
  p_search: string | null;
  p_source: string | null;
  p_sort: LeadSortKey;
  p_dir: 'asc' | 'desc';
  p_limit: number;
  p_offset: number;
  p_start_from: string | null;
  p_start_to: string | null;
  p_status: string | null;
  p_zone: string | null;
}

/** Map UI state onto admin_search_leads arguments. */
export function buildSearchParams(f: LeadFilterState, page: number, pageSize: number): LeadSearchParams {
  return {
    p_search: f.search.trim() || null,
    p_source: f.source === 'all' ? null : f.source,
    p_sort: f.sort,
    p_dir: f.dir,
    p_limit: pageSize,
    p_offset: page * pageSize,
    p_start_from: f.startFrom || null,
    p_start_to: f.startTo || null,
    p_status: f.status || null,
    p_zone: f.zone || null,
  };
}

/** Inclusive source start-date range test (matches the SQL `>=` / `<=`). */
export function inStartRange(startDate: string | null, from: string | null, to: string | null): boolean {
  if (from || to) {
    if (!startDate) return false;
    if (from && startDate < from) return false;
    if (to && startDate > to) return false;
  }
  return true;
}

/** Sort key used by the `student_name` option (last name, then first name). */
export const studentSortKey = (
  first: string | null | undefined,
  last: string | null | undefined,
  fullName?: string | null,
): string =>
  ([last, first].filter(Boolean).join(' ').trim() || fullName || '').toLowerCase();
