// Pure helpers for resolving email recipients from lead rows.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Audience = 'student' | 'guardian' | 'both';

export interface RecipientSource {
  email?: string | null;
  guardian_email?: string | null;
}

export const isValidEmail = (v: string | null | undefined): boolean =>
  !!v && EMAIL_RE.test(v.trim());

export interface RecipientSummary {
  eligible: string[];
  duplicates: number;
  invalid: number;
}

/** Case-insensitive dedupe of a recipient list, with invalid-address counts. */
export function buildRecipientList(
  rows: RecipientSource[],
  audience: Audience,
): RecipientSummary {
  const seen = new Set<string>();
  const eligible: string[] = [];
  let duplicates = 0;
  let invalid = 0;

  const consider = (raw: string | null | undefined) => {
    const value = (raw || '').trim();
    if (!value) return;
    if (!isValidEmail(value)) { invalid += 1; return; }
    const key = value.toLowerCase();
    if (seen.has(key)) { duplicates += 1; return; }
    seen.add(key);
    eligible.push(value);
  };

  for (const r of rows) {
    if (audience === 'student' || audience === 'both') consider(r.email);
    if (audience === 'guardian' || audience === 'both') consider(r.guardian_email);
  }
  return { eligible, duplicates, invalid };
}
