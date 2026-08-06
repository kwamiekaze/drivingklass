// Shared recipient-name resolution for every email path (frontend mirror of
// supabase/functions/_shared/names.ts). Always produces a friendly FIRST name,
// never a generic role word like "Guardian".

const TITLES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'rev', 'sir', 'madam', 'coach',
]);

/** Extract a clean first name from a first name or a full name string. */
export function firstNameFrom(value?: string | null): string {
  if (!value) return '';
  const cleaned = String(value).replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(' ').filter(Boolean);
  for (const part of parts) {
    const bare = part.replace(/[.,]/g, '').toLowerCase();
    if (!bare || TITLES.has(bare)) continue;
    if (bare.length === 1 && parts.length > 1) continue;
    return part.replace(/[.,]+$/, '');
  }
  return parts[0];
}

/** First name for a student / instructor / staff profile row. */
export function profileFirstName(
  profile?: { first_name?: string | null; full_name?: string | null } | null,
): string {
  if (!profile) return '';
  return firstNameFrom(profile.first_name) || firstNameFrom(profile.full_name) || '';
}

/** First name of the guardian stored on a student's profile / intake. */
export function guardianFirstName(
  profile?: { guardian_name?: string | null } | null,
): string {
  return firstNameFrom(profile?.guardian_name);
}

/** Returns the first resolvable first name, or '' so templates fall back to "there". */
export function greetingName(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const n = firstNameFrom(c);
    if (n) return n;
  }
  return '';
}
