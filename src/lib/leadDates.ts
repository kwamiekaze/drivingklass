/**
 * Effective "Added" date helpers for leads.
 *
 * Imported roster leads all share the same database `created_at` audit
 * timestamp (the moment of the bulk import), so their authoritative
 * user-visible date is the source start date. Manual leads keep `created_at`.
 */

export interface LeadDateFields {
  id?: string;
  created_at: string;
  start_date?: string | null;
  import_source?: string | null;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a YYYY-MM-DD string as local midnight so the calendar day never shifts. */
export function parseCalendarDate(value: string): Date {
  const m = DATE_ONLY_RE.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

const isImported = (lead: LeadDateFields): boolean =>
  !!(lead.import_source && lead.import_source.trim());

/** The raw string that should back the visible "Added" date. */
export function effectiveAddedValue(lead: LeadDateFields): string {
  if (isImported(lead) && lead.start_date && lead.start_date.trim()) return lead.start_date;
  return lead.created_at;
}

/** Timezone-safe Date for the visible "Added" date. */
export function effectiveAddedDate(lead: LeadDateFields): Date {
  return parseCalendarDate(effectiveAddedValue(lead));
}

/** True when the visible date is a date-only source start date (no meaningful time). */
export function effectiveAddedIsDateOnly(lead: LeadDateFields): boolean {
  return DATE_ONLY_RE.test(effectiveAddedValue(lead).trim());
}

/** Newest-first comparator on the effective added date, with deterministic ties. */
export function compareByEffectiveAddedDesc(a: LeadDateFields, b: LeadDateFields): number {
  const diff = effectiveAddedDate(b).getTime() - effectiveAddedDate(a).getTime();
  if (diff !== 0 && !Number.isNaN(diff)) return diff;
  const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (createdDiff) return createdDiff;
  return (a.id || '').localeCompare(b.id || '');
}

/** Sorted copy, newest effective added date first. */
export function sortByEffectiveAddedDesc<T extends LeadDateFields>(leads: T[]): T[] {
  return [...leads].sort(compareByEffectiveAddedDesc);
}
