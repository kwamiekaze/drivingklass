// Canonical lead-import parsing / normalization / dedupe logic.
// Pure TypeScript, no Deno or browser APIs: shared by the admin-import-leads
// edge function and by the frontend unit tests.

export const CANONICAL_FIELDS = [
  'student_first_name',
  'student_last_name',
  'phone',
  'email',
  'guardian_first_name',
  'guardian_last_name',
  'guardian_phone',
  'guardian_email',
  'start_date',
  'source_page',
  'source_index',
  'import_source',
  'import_key',
  'source_status',
  'source_location',
  'source_zone',
  'source_account_created_on',
] as const

export type CanonicalField = typeof CANONICAL_FIELDS[number]

export type CanonicalLead = Partial<Record<CanonicalField, string>>

/** Header aliases (normalized: lowercase, non-alphanumerics collapsed to "_"). */
const HEADER_ALIASES: Record<string, CanonicalField> = {}

const alias = (field: CanonicalField, ...names: string[]) => {
  for (const n of [field, ...names]) HEADER_ALIASES[normalizeHeader(n)] = field
}

export function normalizeHeader(h: string): string {
  return String(h ?? '')
    .replace(/\uFEFF/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

alias('student_first_name', 'first name', 'firstname', 'student first', 'student firstname', 'student')
alias('student_last_name', 'last name', 'lastname', 'student last', 'student lastname', 'surname')
alias('phone', 'student phone', 'phone number', 'mobile', 'cell', 'telephone', 'student phone number')
alias('email', 'student email', 'email address', 'e-mail', 'student email address')
alias('guardian_first_name', 'parent first name', 'guardian first', 'parent first')
alias('guardian_last_name', 'parent last name', 'guardian last', 'parent last')
alias('guardian_phone', 'parent phone', 'guardian phone number', 'parent phone number')
alias('guardian_email', 'parent email', 'guardian email address', 'parent email address')
alias('start_date', 'start', 'startdate', 'date started', 'course start date', 'start date')
alias('source_page', 'page', 'page number')
alias('source_index', 'index', 'row', 'row index', 'order', 'position')
alias('import_source', 'source', 'lead source')
alias('import_key', 'key', 'external id', 'externalid', 'source id', 'unique key')
alias('source_status', 'status', 'account status', 'source account status')
alias('source_location', 'location', 'branch', 'office', 'school location')
alias('source_zone', 'zone', 'region', 'territory', 'area')
alias(
  'source_account_created_on',
  'account created on',
  'created on',
  'account created',
  'account creation date',
  'signup date',
  'date created',
)

/** Map raw file headers onto canonical fields. Unknown headers are ignored. */
export function mapHeaders(headers: string[]): {
  map: Record<number, CanonicalField>
  unmapped: string[]
} {
  const map: Record<number, CanonicalField> = {}
  const unmapped: string[] = []
  const used = new Set<CanonicalField>()
  headers.forEach((raw, i) => {
    const field = HEADER_ALIASES[normalizeHeader(raw)]
    if (field && !used.has(field)) {
      map[i] = field
      used.add(field)
    } else if (String(raw ?? '').trim()) {
      unmapped.push(String(raw))
    }
  })
  return { map, unmapped }
}

// ---------------------------------------------------------------- normalizers

export function normalizeText(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

export function normalizeName(v: unknown): string {
  const t = normalizeText(v)
  if (!t) return ''
  return t
    .split(' ')
    .map((w) => (w.length > 2 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w))
    .join(' ')
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function normalizeEmail(v: unknown): { value: string; valid: boolean } {
  const t = normalizeText(v).replace(/^mailto:/i, '').replace(/\s/g, '').toLowerCase()
  if (!t) return { value: '', valid: true }
  return { value: t, valid: EMAIL_RE.test(t) }
}

/** US-centric phone normalization -> "(404) 555-0123", else digits, else invalid. */
export function normalizePhone(v: unknown): { value: string; valid: boolean } {
  const raw = normalizeText(v)
  if (!raw) return { value: '', valid: true }
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  if (digits.length === 10) {
    return { value: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`, valid: true }
  }
  if (digits.length >= 7 && digits.length <= 15) return { value: `+${digits}`, valid: true }
  return { value: raw, valid: false }
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const iso = (y: number, m: number, d: number): string | null => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  if (y < 1900 || y > 2200) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Normalize a date cell to `YYYY-MM-DD`. Returns null when unparseable. */
export function normalizeDate(v: unknown): { value: string; valid: boolean } {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return { value: iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()) ?? '', valid: true }
  }
  const t = normalizeText(v)
  if (!t) return { value: '', valid: true }

  // Excel serial date number
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const serial = Math.floor(Number(t))
    const ms = (serial - 25569) * 86400000
    const d = new Date(ms)
    const out = iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    if (out) return { value: out, valid: true }
  }

  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) {
    const out = iso(+m[1], +m[2], +m[3])
    if (out) return { value: out, valid: true }
  }

  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    let y = +m[3]
    if (y < 100) y += y < 70 ? 2000 : 1900
    const out = iso(y, +m[1], +m[2])
    if (out) return { value: out, valid: true }
  }

  m = t.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mo) {
      const out = iso(+m[3], mo, +m[2])
      if (out) return { value: out, valid: true }
    }
  }

  m = t.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})\.?[-\s](\d{4})$/)
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mo) {
      const out = iso(+m[3], mo, +m[1])
      if (out) return { value: out, valid: true }
    }
  }

  return { value: t, valid: false }
}

function normalizeInt(v: unknown): { value: string; valid: boolean } {
  const t = normalizeText(v)
  if (!t) return { value: '', valid: true }
  if (!/^-?\d+$/.test(t)) return { value: t, valid: false }
  return { value: String(parseInt(t, 10)), valid: true }
}

// ---------------------------------------------------------------- row mapping

export interface RawRow {
  row_number: number
  values: Record<string, unknown>
}

export interface NormalizedRow {
  row_number: number
  fields: CanonicalLead
  errors: string[]
  warnings: string[]
}

/** Normalize + validate a single raw row keyed by canonical field name. */
export function normalizeRow(raw: RawRow): NormalizedRow {
  const v = raw.values
  const fields: CanonicalLead = {}
  const errors: string[] = []
  const warnings: string[] = []

  const put = (f: CanonicalField, value: string) => {
    if (value) fields[f] = value
  }

  put('student_first_name', normalizeName(v.student_first_name))
  put('student_last_name', normalizeName(v.student_last_name))
  put('guardian_first_name', normalizeName(v.guardian_first_name))
  put('guardian_last_name', normalizeName(v.guardian_last_name))
  put('import_source', normalizeText(v.import_source))
  put('import_key', normalizeText(v.import_key))
  put('source_status', normalizeText(v.source_status))
  put('source_location', normalizeText(v.source_location))
  put('source_zone', normalizeText(v.source_zone))

  const email = normalizeEmail(v.email)
  if (!email.valid) errors.push(`Invalid student email "${normalizeText(v.email)}"`)
  else put('email', email.value)

  const gEmail = normalizeEmail(v.guardian_email)
  if (!gEmail.valid) errors.push(`Invalid guardian email "${normalizeText(v.guardian_email)}"`)
  else put('guardian_email', gEmail.value)

  const phone = normalizePhone(v.phone)
  if (!phone.valid) warnings.push(`Unrecognized student phone "${normalizeText(v.phone)}" (kept as-is)`)
  put('phone', phone.value)

  const gPhone = normalizePhone(v.guardian_phone)
  if (!gPhone.valid) warnings.push(`Unrecognized guardian phone "${normalizeText(v.guardian_phone)}" (kept as-is)`)
  put('guardian_phone', gPhone.value)

  const start = normalizeDate(v.start_date)
  if (!start.valid) errors.push(`Unparseable start date "${normalizeText(v.start_date)}"`)
  else if (!start.value) errors.push('Missing start date')
  else put('start_date', start.value)

  const created = normalizeDate(v.source_account_created_on)
  if (!created.valid) warnings.push(`Unparseable account-created date "${normalizeText(v.source_account_created_on)}"`)
  else put('source_account_created_on', created.value)

  const page = normalizeInt(v.source_page)
  if (!page.valid) warnings.push(`Non-numeric source page "${normalizeText(v.source_page)}"`)
  else put('source_page', page.value)

  const index = normalizeInt(v.source_index)
  if (!index.valid) warnings.push(`Non-numeric source index "${normalizeText(v.source_index)}"`)
  else put('source_index', index.value)

  if (!fields.student_first_name && !fields.student_last_name) {
    errors.push('Missing student name')
  }

  return { row_number: raw.row_number, fields, errors, warnings }
}

// ---------------------------------------------------------------- dedupe keys

export type MatchStrategy = 'import_key' | 'email' | 'name_phone'

export interface MatchKey {
  strategy: MatchStrategy
  value: string
}

export const nameKey = (first?: string, last?: string) =>
  [first, last].map((x) => normalizeText(x).toLowerCase()).filter(Boolean).join(' ')

export const phoneKey = (phone?: string) => normalizeText(phone).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')

/**
 * Ordered dedupe keys for a row: import_key first, then normalized student
 * email, then the conservative name+phone fallback (only when BOTH exist).
 */
export function matchKeysFor(fields: CanonicalLead): MatchKey[] {
  const keys: MatchKey[] = []
  if (fields.import_key) keys.push({ strategy: 'import_key', value: fields.import_key })
  if (fields.email) keys.push({ strategy: 'email', value: fields.email.toLowerCase() })
  const n = nameKey(fields.student_first_name, fields.student_last_name)
  const p = phoneKey(fields.phone)
  if (n && p && fields.student_first_name && fields.student_last_name) {
    keys.push({ strategy: 'name_phone', value: `${n}|${p}` })
  }
  return keys
}

// ---------------------------------------------------------------- diffing

export interface ExistingLead {
  id: string
  import_key: string | null
  email: string | null
  phone: string | null
  student_first_name: string | null
  student_last_name: string | null
  guardian_first_name: string | null
  guardian_last_name: string | null
  guardian_email: string | null
  guardian_phone: string | null
  start_date: string | null
  source_page: number | null
  source_index: number | null
  import_source: string | null
  source_status: string | null
  source_location: string | null
  source_zone: string | null
  source_account_created_on: string | null
}

/** Fields on the existing row that the import would actually change. */
export function changedFields(fields: CanonicalLead, existing: ExistingLead): CanonicalField[] {
  const out: CanonicalField[] = []
  for (const f of CANONICAL_FIELDS) {
    const next = fields[f]
    if (!next) continue
    const current = (existing as unknown as Record<string, unknown>)[f]
    const currentStr = current === null || current === undefined ? '' : String(current)
    if (currentStr !== next) out.push(f)
  }
  return out
}

export type RowAction = 'new' | 'updated' | 'unchanged' | 'duplicate' | 'invalid' | 'ambiguous'

export interface PlannedRow {
  row_number: number
  action: RowAction
  match_id: string | null
  matched_by: MatchStrategy | null
  fields: CanonicalLead
  errors: string[]
  warnings: string[]
  changed: CanonicalField[]
  label: string
}

export interface ImportCounts {
  total: number
  new: number
  updated: number
  unchanged: number
  duplicate: number
  invalid: number
  ambiguous: number
}

export function emptyCounts(): ImportCounts {
  return { total: 0, new: 0, updated: 0, unchanged: 0, duplicate: 0, invalid: 0, ambiguous: 0 }
}

export function countRows(rows: PlannedRow[]): ImportCounts {
  const c = emptyCounts()
  for (const r of rows) {
    c.total++
    c[r.action]++
  }
  return c
}

/**
 * Build the import plan. `lookup` resolves a match key to zero, one, or many
 * existing lead ids — more than one is treated as ambiguous and never merged.
 */
export function planImport(
  rows: NormalizedRow[],
  lookup: (key: MatchKey) => string[],
): PlannedRow[] {
  const seenKeys = new Map<string, number>()
  const claimed = new Set<string>()
  const planned: PlannedRow[] = []

  for (const r of rows) {
    const label = [r.fields.student_first_name, r.fields.student_last_name].filter(Boolean).join(' ')
      || r.fields.email || `Row ${r.row_number}`

    if (r.errors.length) {
      planned.push({ ...r, action: 'invalid', match_id: null, matched_by: null, changed: [], label })
      continue
    }

    const keys = matchKeysFor(r.fields)

    // In-file duplicate?
    const dupKey = keys.map((k) => `${k.strategy}:${k.value}`).find((k) => seenKeys.has(k))
    if (dupKey) {
      planned.push({
        ...r,
        action: 'duplicate',
        match_id: null,
        matched_by: null,
        changed: [],
        label,
        warnings: [...r.warnings, `Duplicate of row ${seenKeys.get(dupKey)} in this file`],
      })
      continue
    }
    for (const k of keys) seenKeys.set(`${k.strategy}:${k.value}`, r.row_number)

    let matchId: string | null = null
    let matchedBy: MatchStrategy | null = null
    let ambiguous = false
    for (const k of keys) {
      const hits = lookup(k)
      if (hits.length > 1) { ambiguous = true; break }
      if (hits.length === 1) { matchId = hits[0]; matchedBy = k.strategy; break }
    }

    if (ambiguous) {
      planned.push({
        ...r,
        action: 'ambiguous',
        match_id: null,
        matched_by: null,
        changed: [],
        label,
        warnings: [...r.warnings, 'Matches more than one existing lead — skipped to avoid merging two people'],
      })
      continue
    }

    if (matchId && claimed.has(matchId)) {
      planned.push({
        ...r,
        action: 'duplicate',
        match_id: null,
        matched_by: null,
        changed: [],
        label,
        warnings: [...r.warnings, 'Another row in this file already targets that lead'],
      })
      continue
    }

    if (!matchId) {
      planned.push({ ...r, action: 'new', match_id: null, matched_by: null, changed: [], label })
      continue
    }

    claimed.add(matchId)
    planned.push({
      ...r,
      action: 'pending-diff' as RowAction,
      match_id: matchId,
      matched_by: matchedBy,
      changed: [],
      label,
    })
  }

  return planned
}

/** Second pass: resolve matched rows into `updated` vs `unchanged`. */
export function applyDiffs(rows: PlannedRow[], existingById: Map<string, ExistingLead>): PlannedRow[] {
  return rows.map((r) => {
    if (r.match_id === null) return r
    const existing = existingById.get(r.match_id)
    if (!existing) return { ...r, action: 'new', match_id: null, matched_by: null }
    const changed = changedFields(r.fields, existing)
    return { ...r, changed, action: changed.length ? 'updated' : 'unchanged' }
  })
}
