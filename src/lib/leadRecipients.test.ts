import { describe, expect, it } from 'vitest';
import { buildRecipientList, isValidEmail } from './leadRecipients';

const rows = [
  { email: 'Kid@Example.com', guardian_email: 'parent@example.com' },
  { email: 'kid@example.com', guardian_email: 'parent@example.com' },
  { email: 'broken-email', guardian_email: null },
  { email: '  spaced@example.com  ', guardian_email: '' },
];

describe('isValidEmail', () => {
  it('accepts normal addresses and rejects junk', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe('buildRecipientList', () => {
  it('dedupes case-insensitively across students and guardians', () => {
    const r = buildRecipientList(rows, 'both');
    expect(r.eligible).toEqual(['Kid@Example.com', 'parent@example.com', 'spaced@example.com']);
    expect(r.duplicates).toBe(2);
    expect(r.invalid).toBe(1);
  });

  it('respects audience selection', () => {
    expect(buildRecipientList(rows, 'guardian').eligible).toEqual(['parent@example.com']);
    expect(buildRecipientList(rows, 'student').eligible).toEqual(['Kid@Example.com', 'spaced@example.com']);
  });
});
