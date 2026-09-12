// Pure helpers for the admin-only "draft email" tools on Student Leads.
// These helpers only ever BUILD compose URLs (Gmail web compose / mailto).
// Nothing here sends, saves, queues, or logs mail, and no network call is made.

export type DraftAudience = 'students' | 'guardians' | 'both';

export interface DraftRecipientSource {
  email?: string | null;
  guardian_email?: string | null;
}

/** Fixed visible To address — recipient addresses always go in BCC. */
export const DRAFT_TO_ADDRESS = 'connect@drivingklass.com';

export const DEFAULT_DRAFT_SUBJECT = 'Think You Have 5 Star Driving Skills?';

export const DEFAULT_DRAFT_BODY = [
  'Hi,',
  '',
  'Before the real road comes the challenge.',
  '',
  'Driving Klass created a quick driving mini game to help students test their focus, reaction time, and decision making skills in a fun way.',
  '',
  'Play now: https://drivingklass.com/play',
  '',
  'You can also request full road test videos using the message form on our homepage.',
  '',
  'Driving Klass - Where 5 Star Drivers Are Made.',
  '',
  'Give it a try and see how your driving instincts stack up.',
].join('\n');

/** Conservative caps so a generated compose URL always opens reliably. */
export const MAX_BCC_PER_BATCH = 75;
export const MAX_URL_LENGTH = 7500;

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Trim, drop a `mailto:` prefix, strip whitespace, lowercase. */
export function normalizeAddress(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/^\s*mailto:/i, '').replace(/\s+/g, '').toLowerCase();
}

export function isValidAddress(value: unknown): boolean {
  const a = normalizeAddress(value);
  return a.length > 0 && a.length <= 254 && EMAIL_RE.test(a);
}

export interface RecipientCollection {
  /** Unique, normalized, valid addresses in first-seen order. */
  recipients: string[];
  /** Non-empty candidate addresses rejected as invalid. */
  invalid: number;
  /** Valid addresses dropped because the same address already appeared. */
  duplicates: number;
  /** Rows that contributed no usable address for the chosen audience. */
  rowsWithoutAddress: number;
}

/** Fields consulted for each audience mode. */
function candidatesFor(row: DraftRecipientSource, audience: DraftAudience): unknown[] {
  if (audience === 'students') return [row.email];
  if (audience === 'guardians') return [row.guardian_email];
  return [row.email, row.guardian_email];
}

/**
 * Collect the BCC list for an audience: normalized, case-insensitively
 * deduplicated across student and guardian fields, blanks and invalid
 * addresses excluded and counted.
 */
export function collectRecipients(
  rows: DraftRecipientSource[],
  audience: DraftAudience,
): RecipientCollection {
  const seen = new Set<string>();
  const recipients: string[] = [];
  let invalid = 0;
  let duplicates = 0;
  let rowsWithoutAddress = 0;

  for (const row of rows) {
    let usable = 0;
    for (const candidate of candidatesFor(row, audience)) {
      const normalized = normalizeAddress(candidate);
      if (!normalized) continue;
      if (!isValidAddress(normalized)) { invalid++; continue; }
      usable++;
      if (seen.has(normalized)) { duplicates++; continue; }
      seen.add(normalized);
      recipients.push(normalized);
    }
    if (usable === 0) rowsWithoutAddress++;
  }

  return { recipients, invalid, duplicates, rowsWithoutAddress };
}

export interface DraftContent {
  subject: string;
  body: string;
  to?: string;
}

/** Gmail web compose URL. Opening it only shows a draft; it never sends. */
export function buildGmailComposeUrl(bcc: string[], content: DraftContent): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: content.to ?? DRAFT_TO_ADDRESS,
    su: content.subject,
    body: content.body,
  });
  if (bcc.length) params.set('bcc', bcc.join(','));
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Fallback compose link handled by the operating system's mail client. */
export function buildMailtoUrl(bcc: string[], content: DraftContent): string {
  const params = new URLSearchParams({ subject: content.subject, body: content.body });
  if (bcc.length) params.set('bcc', bcc.join(','));
  return `mailto:${encodeURIComponent(content.to ?? DRAFT_TO_ADDRESS)}?${params.toString()}`;
}

export interface DraftBatch {
  index: number;
  recipients: string[];
  gmailUrl: string;
  mailtoUrl: string;
}

/**
 * Split recipients into deterministic BCC batches that respect both the
 * recipient cap and the encoded URL-length cap. Input order is preserved and
 * a single oversized recipient still gets its own batch.
 */
export function buildDraftBatches(
  recipients: string[],
  content: DraftContent,
  limits: { maxRecipients?: number; maxUrlLength?: number } = {},
): DraftBatch[] {
  const maxRecipients = Math.max(1, limits.maxRecipients ?? MAX_BCC_PER_BATCH);
  const maxUrlLength = Math.max(1, limits.maxUrlLength ?? MAX_URL_LENGTH);

  const batches: string[][] = [];
  let current: string[] = [];

  for (const address of recipients) {
    const next = [...current, address];
    const tooMany = next.length > maxRecipients;
    const tooLong = buildGmailComposeUrl(next, content).length > maxUrlLength;
    if (current.length && (tooMany || tooLong)) {
      batches.push(current);
      current = [address];
    } else {
      current = next;
    }
  }
  if (current.length) batches.push(current);

  return batches.map((group, i) => ({
    index: i + 1,
    recipients: group,
    gmailUrl: buildGmailComposeUrl(group, content),
    mailtoUrl: buildMailtoUrl(group, content),
  }));
}

/** Single-recipient draft used by the per-row Draft email action. */
export function buildSingleDraft(address: unknown, content: DraftContent): DraftBatch | null {
  const normalized = normalizeAddress(address);
  if (!isValidAddress(normalized)) return null;
  return buildDraftBatches([normalized], content)[0] ?? null;
}
