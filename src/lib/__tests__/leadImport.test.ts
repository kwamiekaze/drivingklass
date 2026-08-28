import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyDiffs, changedFields, countRows, mapHeaders, matchKeysFor, normalizeDate, normalizeEmail,
  normalizePhone, normalizeRow, planImport, emailKey,
  type ExistingLead, type MatchKey, type NormalizedRow, type PlannedRow,
} from '@/lib/leadImport';

describe('shared logic stays in sync with the edge function copy', () => {
  it('src/lib/leadImport.ts is identical to supabase/functions/_shared/leadImport.ts', () => {
    const a = readFileSync('src/lib/leadImport.ts', 'utf8');
    const b = readFileSync('supabase/functions/_shared/leadImport.ts', 'utf8');
    expect(a).toEqual(b);
  });
});

describe('header mapping', () => {
  it('maps aliases and reports unmapped headers', () => {
    const { map, unmapped } = mapHeaders([
      'First Name', 'Last Name', 'Phone Number', 'E-Mail', 'Parent Email',
      'Start Date', 'Account Created On', 'Zone', 'Location', 'Status', 'Nickname',
    ]);
    expect(map[0]).toBe('student_first_name');
    expect(map[1]).toBe('student_last_name');
    expect(map[2]).toBe('phone');
    expect(map[3]).toBe('email');
    expect(map[4]).toBe('guardian_email');
    expect(map[5]).toBe('start_date');
    expect(map[6]).toBe('source_account_created_on');
    expect(map[7]).toBe('source_zone');
    expect(map[8]).toBe('source_location');
    expect(map[9]).toBe('source_status');
    expect(unmapped).toEqual(['Nickname']);
  });

  it('ignores a duplicated header instead of overwriting', () => {
    const { map, unmapped } = mapHeaders(['Email', 'Email']);
    expect(map[0]).toBe('email');
    expect(map[1]).toBeUndefined();
    expect(unmapped).toEqual(['Email']);
  });
});

describe('normalizers', () => {
  it('normalizes dates from many formats', () => {
    expect(normalizeDate('2026-03-04').value).toBe('2026-03-04');
    expect(normalizeDate('3/4/2026').value).toBe('2026-03-04');
    expect(normalizeDate('03.04.26').value).toBe('2026-03-04');
    expect(normalizeDate('Mar 4, 2026').value).toBe('2026-03-04');
    expect(normalizeDate('4-Mar-2026').value).toBe('2026-03-04');
    expect(normalizeDate(new Date(Date.UTC(2026, 2, 4))).value).toBe('2026-03-04');
    expect(normalizeDate('').valid).toBe(true);
    expect(normalizeDate('not a date').valid).toBe(false);
    expect(normalizeDate('2026-02-30').valid).toBe(false);
  });

  it('normalizes phones and emails', () => {
    expect(normalizePhone('404-555-0123')).toEqual({ value: '(404) 555-0123', valid: true });
    expect(normalizePhone('+1 (404) 555 0123').value).toBe('(404) 555-0123');
    expect(normalizePhone('123').valid).toBe(false);
    expect(normalizeEmail('  Foo@Bar.COM ')).toEqual({ value: 'foo@bar.com', valid: true });
    expect(normalizeEmail('nope@nope').valid).toBe(false);
    expect(normalizeEmail('').valid).toBe(true);
  });
});

const row = (n: number, values: Record<string, unknown>) => normalizeRow({ row_number: n, values });

describe('row validation', () => {
  it('accepts a good row', () => {
    const r = row(1, {
      student_first_name: 'ADA', student_last_name: 'Lovelace',
      email: 'ADA@example.com', phone: '4045550123', start_date: '3/4/2026',
    });
    expect(r.errors).toEqual([]);
    expect(r.fields.student_first_name).toBe('Ada');
    expect(r.fields.email).toBe('ada@example.com');
    expect(r.fields.start_date).toBe('2026-03-04');
  });

  it('flags missing name and missing/invalid start date', () => {
    expect(row(2, { start_date: '2026-01-01' }).errors).toContain('Missing student name');
    expect(row(3, { student_first_name: 'Ada' }).errors).toContain('Missing start date');
    expect(row(4, { student_first_name: 'Ada', start_date: 'soon' }).errors.join(' ')).toMatch(/Unparseable start date/);
  });

  it('flags invalid emails but only warns on odd phones', () => {
    const r = row(5, { student_first_name: 'Ada', start_date: '2026-01-01', email: 'bad@', phone: '12' });
    expect(r.errors.join(' ')).toMatch(/Invalid student email/);
    expect(r.warnings.join(' ')).toMatch(/Unrecognized student phone/);
  });
});

describe('dedupe matching', () => {
  it('prefers import_key, then email, then a conservative name+phone', () => {
    expect(matchKeysFor({ import_key: 'K1', email: 'a@b.com' })[0]).toEqual({ strategy: 'import_key', value: 'K1' });
    expect(matchKeysFor({ email: 'A@B.com' })[0]).toEqual({ strategy: 'email', value: 'a@b.com|' });
    expect(matchKeysFor({ email: 'A@B.com', student_first_name: 'Ada', student_last_name: 'Lovelace' })[0])
      .toEqual({ strategy: 'email', value: 'a@b.com|ada lovelace' });
    const nameOnly = matchKeysFor({ student_first_name: 'Ada', student_last_name: 'Lovelace', phone: '(404) 555-0123' });
    expect(nameOnly).toEqual([{ strategy: 'name_phone', value: 'ada lovelace|4045550123' }]);
    // no phone, or no last name -> no fallback key (never merge ambiguous people)
    expect(matchKeysFor({ student_first_name: 'Ada', student_last_name: 'Lovelace' })).toEqual([]);
    expect(matchKeysFor({ student_first_name: 'Ada', phone: '4045550123' })).toEqual([]);
  });

  const good = (n: number, extra: Record<string, unknown> = {}) =>
    row(n, { student_first_name: 'Ada', student_last_name: 'Lovelace', start_date: '2026-01-01', ...extra });

  it('marks in-file repeats as duplicates and multi-hits as ambiguous', () => {
    const rows: NormalizedRow[] = [
      good(1, { email: 'a@b.com' }),
      good(2, { email: 'a@b.com' }),
      good(3, { email: 'many@b.com' }),
    ];
    const lookup = (k: MatchKey) => (k.value.startsWith('many@b.com') ? ['id1', 'id2'] : []);
    const planned = planImport(rows, lookup);
    expect(planned[0].action).toBe('new');
    expect(planned[1].action).toBe('duplicate');
    expect(planned[2].action).toBe('ambiguous');
  });

  it('resolves matched rows into updated vs unchanged', () => {
    const existing: ExistingLead = {
      id: 'lead-1', import_key: null, email: 'a@b.com', phone: '(404) 555-0123',
      student_first_name: 'Ada', student_last_name: 'Lovelace',
      guardian_first_name: null, guardian_last_name: null, guardian_email: null, guardian_phone: null,
      start_date: '2026-01-01', source_page: null, source_index: 7, import_source: 'imported_student_roster',
      source_status: null, source_location: null, source_zone: null, source_account_created_on: null,
    };
    const unchangedRow = good(1, { email: 'a@b.com', phone: '4045550123', source_index: '7', import_source: 'imported_student_roster' });
    const changedRow = good(2, { email: 'a@b.com', phone: '4045550123', source_index: '7', import_source: 'imported_student_roster', source_zone: 'North' });

    const build = (r: NormalizedRow): PlannedRow[] =>
      applyDiffs(planImport([r], (k) => (k.strategy === 'email' ? ['lead-1'] : [])), new Map([['lead-1', existing]]));

    expect(build(unchangedRow)[0].action).toBe('unchanged');
    const updated = build(changedRow)[0];
    expect(updated.action).toBe('updated');
    expect(updated.changed).toEqual(['source_zone']);
    expect(updated.match_id).toBe('lead-1');
  });

  it('never reports a blank incoming value as a change', () => {
    const existing = {
      id: 'x', import_key: null, email: 'a@b.com', phone: null,
      student_first_name: 'Ada', student_last_name: 'Lovelace',
      guardian_first_name: null, guardian_last_name: null, guardian_email: null, guardian_phone: null,
      start_date: '2026-01-01', source_page: null, source_index: null, import_source: null,
      source_status: null, source_location: null, source_zone: null, source_account_created_on: null,
    } satisfies ExistingLead;
    expect(changedFields({ student_first_name: 'Ada' }, existing)).toEqual([]);
  });
});

describe('dry-run vs commit behaviour', () => {
  const lookup = (k: MatchKey) => (k.value.startsWith('known@b.com') ? ['lead-9'] : []);
  const existing: ExistingLead = {
    id: 'lead-9', import_key: null, email: 'known@b.com', phone: null,
    student_first_name: 'Grace', student_last_name: 'Hopper',
    guardian_first_name: null, guardian_last_name: null, guardian_email: null, guardian_phone: null,
    start_date: '2020-01-01', source_page: null, source_index: null, import_source: null,
    source_status: null, source_location: null, source_zone: null, source_account_created_on: null,
  };

  const rows = [
    row(1, { student_first_name: 'Ada', student_last_name: 'Lovelace', start_date: '2026-01-01', email: 'new@b.com' }),
    row(2, { student_first_name: 'Grace', student_last_name: 'Hopper', start_date: '2026-02-01', email: 'known@b.com' }),
    row(3, { student_first_name: 'Bad', start_date: '' }),
  ];

  const planned = applyDiffs(planImport(rows, lookup), new Map([['lead-9', existing]]));

  it('counts every outcome', () => {
    expect(countRows(planned)).toMatchObject({ total: 3, new: 1, updated: 1, invalid: 1, duplicate: 0, unchanged: 0, ambiguous: 0 });
  });

  it('only new/updated rows would be written on commit', () => {
    const writable = planned.filter((r) => r.action === 'new' || r.action === 'updated');
    expect(writable.map((r) => r.row_number)).toEqual([1, 2]);
    expect(writable.map((r) => r.match_id)).toEqual([null, 'lead-9']);
  });

  it('a re-run of the same file is idempotent (everything unchanged)', () => {
    const rerun = applyDiffs(
      planImport([rows[1]], lookup),
      new Map([['lead-9', { ...existing, start_date: '2026-02-01' }]]),
    );
    expect(rerun[0].action).toBe('unchanged');
  });
});

describe('duplicate protection', () => {
  const base = (n: number, extra: Record<string, unknown> = {}): NormalizedRow =>
    normalizeRow({ row_number: n, values: { start_date: '2026-01-01', ...extra } });

  it('never merges two different students that share one family email', () => {
    const shared = 'family@example.com';
    const sibling: ExistingLead = {
      id: 'lead-sib', import_key: null, email: shared, phone: null,
      student_first_name: 'Ada', student_last_name: 'Lovelace',
      guardian_first_name: null, guardian_last_name: null, guardian_email: null, guardian_phone: null,
      start_date: '2026-01-01', source_page: null, source_index: null, import_source: null,
      source_status: null, source_location: null, source_zone: null, source_account_created_on: null,
    };
    // Index the existing sibling the way the edge function does.
    const index = new Map<string, string[]>([
      [`email:${emailKey(sibling.email!, sibling.student_first_name!, sibling.student_last_name!)}`, ['lead-sib']],
    ]);
    const lookup = (k: MatchKey) => index.get(`${k.strategy}:${k.value}`) ?? [];

    const other = base(1, { student_first_name: 'Charles', student_last_name: 'Babbage', email: shared });
    const same = base(2, { student_first_name: 'Ada', student_last_name: 'Lovelace', email: shared });

    expect(planImport([other], lookup)[0]).toMatchObject({ action: 'new', match_id: null });
    expect(planImport([same], lookup)[0]).toMatchObject({ match_id: 'lead-sib', matched_by: 'email' });
  });

  it('treats two rows with the same import key as one lead (second row is a duplicate)', () => {
    const rows = [
      base(1, { student_first_name: 'Ada', student_last_name: 'Lovelace', import_key: 'imported_student_roster:5' }),
      base(2, { student_first_name: 'Ada', student_last_name: 'Lovelace', import_key: 'imported_student_roster:5' }),
    ];
    const planned = planImport(rows, () => []);
    expect(planned[0].action).toBe('new');
    expect(planned[1].action).toBe('duplicate');
  });

  it('skips and reports ambiguous multi-hit matches instead of merging', () => {
    const rows = [base(1, { student_first_name: 'Ada', student_last_name: 'Lovelace', import_key: 'K9' })];
    const planned = planImport(rows, () => ['a', 'b']);
    expect(planned[0].action).toBe('ambiguous');
    expect(planned[0].match_id).toBeNull();
    expect(planned[0].warnings.join(' ')).toMatch(/more than one existing lead/i);
  });
});
