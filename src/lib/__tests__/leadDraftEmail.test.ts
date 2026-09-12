import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DRAFT_BODY,
  DEFAULT_DRAFT_SUBJECT,
  DRAFT_TO_ADDRESS,
  buildDraftBatches,
  buildGmailComposeUrl,
  buildMailtoUrl,
  buildSingleDraft,
  collectRecipients,
  isValidAddress,
  normalizeAddress,
} from '@/lib/leadDraftEmail';

const content = { subject: DEFAULT_DRAFT_SUBJECT, body: DEFAULT_DRAFT_BODY };

describe('address normalization', () => {
  it('trims, lowercases and strips mailto prefixes', () => {
    expect(normalizeAddress('  MailTo:Test@Example.COM ')).toBe('test@example.com');
    expect(normalizeAddress(null)).toBe('');
    expect(normalizeAddress(undefined)).toBe('');
  });

  it('rejects blank and malformed addresses', () => {
    for (const bad of ['', '   ', 'nope', 'a@b', 'a@@b.com', 'a b@c.com']) {
      expect(isValidAddress(bad)).toBe(false);
    }
    expect(isValidAddress('Student@Gmail.com')).toBe(true);
  });
});

describe('collectRecipients', () => {
  const rows = [
    { email: 'One@Example.com', guardian_email: 'guardian@example.com' },
    { email: 'one@example.com', guardian_email: null },   // case-insensitive duplicate
    { email: 'broken-address', guardian_email: '' },       // invalid + blank
    { email: null, guardian_email: 'GUARDIAN@example.com' }, // cross-field duplicate
    { email: 'two@example.com', guardian_email: 'g2@example.com' },
  ];

  it('dedupes case-insensitively across student and guardian fields', () => {
    const r = collectRecipients(rows, 'both');
    expect(r.recipients).toEqual([
      'one@example.com', 'guardian@example.com', 'two@example.com', 'g2@example.com',
    ]);
    expect(r.duplicates).toBe(2);
    expect(r.invalid).toBe(1);
    expect(r.rowsWithoutAddress).toBe(1);
  });

  it('honours the students and guardians audience modes', () => {
    expect(collectRecipients(rows, 'students').recipients)
      .toEqual(['one@example.com', 'two@example.com']);
    expect(collectRecipients(rows, 'guardians').recipients)
      .toEqual(['guardian@example.com', 'g2@example.com']);
  });

  it('returns an empty list for no rows', () => {
    expect(collectRecipients([], 'both').recipients).toEqual([]);
  });
});

describe('compose URLs', () => {
  it('puts recipients in BCC only and keeps To fixed', () => {
    const url = buildGmailComposeUrl(['a@x.com', 'b@x.com'], content);
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://mail.google.com/mail/');
    expect(parsed.searchParams.get('to')).toBe(DRAFT_TO_ADDRESS);
    expect(parsed.searchParams.get('bcc')).toBe('a@x.com,b@x.com');
    expect(parsed.searchParams.get('cc')).toBeNull();
    expect(parsed.searchParams.get('su')).toBe(DEFAULT_DRAFT_SUBJECT);
    expect(parsed.searchParams.get('body')).toBe(DEFAULT_DRAFT_BODY);
  });

  it('is a compose-only URL with no send parameter', () => {
    const url = buildGmailComposeUrl(['a@x.com'], content);
    expect(url).toContain('view=cm');
    expect(url).not.toMatch(/send|api|smtp/i);
  });

  it('builds a mailto fallback with bcc', () => {
    const url = buildMailtoUrl(['a@x.com'], content);
    expect(url.startsWith('mailto:')).toBe(true);
    expect(url).toContain('bcc=a%40x.com');
  });
});

describe('batching', () => {
  const many = Array.from({ length: 160 }, (_, i) => `person${i}@example.com`);

  it('respects the recipient cap deterministically', () => {
    const a = buildDraftBatches(many, content, { maxRecipients: 50, maxUrlLength: 1e6 });
    const b = buildDraftBatches(many, content, { maxRecipients: 50, maxUrlLength: 1e6 });
    expect(a.map((x) => x.recipients)).toEqual(b.map((x) => x.recipients));
    expect(a).toHaveLength(4);
    expect(a[0].recipients).toHaveLength(50);
    expect(a[3].recipients).toHaveLength(10);
    expect(a.flatMap((x) => x.recipients)).toEqual(many);
    expect(a.map((x) => x.index)).toEqual([1, 2, 3, 4]);
  });

  it('respects the encoded URL length cap', () => {
    const batches = buildDraftBatches(many, content, { maxRecipients: 500, maxUrlLength: 1200 });
    expect(batches.length).toBeGreaterThan(1);
    for (const b of batches) expect(b.gmailUrl.length).toBeLessThanOrEqual(1200);
    expect(batches.flatMap((b) => b.recipients)).toEqual(many);
  });

  it('always emits at least one batch for a single oversized recipient', () => {
    const batches = buildDraftBatches(['solo@example.com'], content, { maxUrlLength: 10 });
    expect(batches).toHaveLength(1);
    expect(batches[0].recipients).toEqual(['solo@example.com']);
  });

  it('returns no batches for an empty recipient list', () => {
    expect(buildDraftBatches([], content)).toEqual([]);
  });
});

describe('single draft', () => {
  it('builds one draft or nothing for an unusable address', () => {
    expect(buildSingleDraft(' Person@Example.com ', content)?.recipients).toEqual(['person@example.com']);
    expect(buildSingleDraft('not-an-address', content)).toBeNull();
    expect(buildSingleDraft(null, content)).toBeNull();
  });
});

describe('defaults', () => {
  it('keeps the approved subject and body copy', () => {
    expect(DEFAULT_DRAFT_SUBJECT).toBe('Think You Have 5 Star Driving Skills?');
    expect(DEFAULT_DRAFT_BODY.startsWith('Hi,')).toBe(true);
    expect(DEFAULT_DRAFT_BODY).toContain('https://drivingklass.com/play');
    expect(DEFAULT_DRAFT_BODY).toContain('Driving Klass - Where 5 Star Drivers Are Made.');
    expect(DEFAULT_DRAFT_BODY.trimEnd().endsWith('how your driving instincts stack up.')).toBe(true);
  });
});
