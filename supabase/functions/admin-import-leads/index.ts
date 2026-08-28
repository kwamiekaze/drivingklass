// Admin-only lead import (dry-run preview + transactional commit).
// No emails are ever sent from this function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import {
  applyDiffs, countRows, planImport, normalizeRow,
  emailKey, nameKey, phoneKey,
  type CanonicalLead, type ExistingLead, type MatchKey, type NormalizedRow, type PlannedRow, type RawRow,
} from '../_shared/leadImport.ts'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const SELECT_COLS =
  'id, import_key, email, phone, student_first_name, student_last_name, guardian_first_name, guardian_last_name,' +
  ' guardian_email, guardian_phone, start_date, source_page, source_index, import_source,' +
  ' source_status, source_location, source_zone, source_account_created_on'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return json({ error: 'unauthorized' }, 401)

  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (roleError) return json({ error: 'role check failed' }, 500)
  if (!isAdmin) return json({ error: 'forbidden: admin only' }, 403)

  let payload: {
    mode?: 'dry_run' | 'commit'
    rows?: RawRow[]
    import_source?: string
    index_offset?: number
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  const mode = payload.mode === 'commit' ? 'commit' : 'dry_run'
  const rawRows = Array.isArray(payload.rows) ? payload.rows : []
  if (!rawRows.length) return json({ error: 'no rows supplied' }, 400)
  if (rawRows.length > 1000) return json({ error: 'too many rows in one request (max 1000)' }, 400)

  const importSource = (payload.import_source || '').trim()
  const indexOffset = Number(payload.index_offset) || 0

  // 1. Normalize (preserving uploaded order / row numbers)
  const normalized: NormalizedRow[] = rawRows.map((raw, i) => {
    const n = normalizeRow(raw)
    if (importSource && !n.fields.import_source) n.fields.import_source = importSource
    if (!n.fields.source_index) n.fields.source_index = String(indexOffset + i + 1)
    return n
  })

  // 2. Gather match candidates from the database
  const valid = normalized.filter((n) => !n.errors.length)
  const importKeys = [...new Set(valid.map((n) => n.fields.import_key).filter(Boolean) as string[])]
  const emails = [...new Set(valid.map((n) => n.fields.email).filter(Boolean) as string[])]
  const phoneRows = valid.filter((n) => n.fields.phone && n.fields.student_first_name && n.fields.student_last_name)

  const candidates = new Map<string, ExistingLead>()
  const collect = (rows: ExistingLead[] | null) => {
    for (const r of rows ?? []) candidates.set(r.id, r)
  }

  try {
    for (const part of chunk(importKeys, 100)) {
      const { data, error } = await supabase.from('leads').select(SELECT_COLS).in('import_key', part)
      if (error) throw error
      collect(data as unknown as ExistingLead[])
    }
    for (const part of chunk(emails, 40)) {
      const filter = part.map((e) => `email.ilike.${e.replace(/[,()]/g, '')}`).join(',')
      const { data, error } = await supabase.from('leads').select(SELECT_COLS).or(filter)
      if (error) throw error
      collect(data as unknown as ExistingLead[])
    }
    const phoneVariants = [...new Set(phoneRows.flatMap((n) => {
      const digits = phoneKey(n.fields.phone)
      return [
        n.fields.phone!,
        digits,
        `+1${digits}`,
        digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : digits,
      ]
    }))]
    for (const part of chunk(phoneVariants, 100)) {
      const { data, error } = await supabase.from('leads').select(SELECT_COLS).in('phone', part)
      if (error) throw error
      collect(data as unknown as ExistingLead[])
    }
  } catch (e) {
    return json({ error: `lookup failed: ${(e as Error).message}` }, 500)
  }

  // 3. Index candidates by match key
  const byKey = new Map<string, string[]>()
  const push = (k: string, id: string) => {
    const list = byKey.get(k) ?? []
    if (!list.includes(id)) list.push(id)
    byKey.set(k, list)
  }
  for (const c of candidates.values()) {
    if (c.import_key) push(`import_key:${c.import_key}`, c.id)
    if (c.email) push(`email:${c.email.trim().toLowerCase()}`, c.id)
    const n = nameKey(c.student_first_name ?? '', c.student_last_name ?? '')
    const p = phoneKey(c.phone ?? '')
    if (n && p && c.student_first_name && c.student_last_name) push(`name_phone:${n}|${p}`, c.id)
  }
  const lookup = (k: MatchKey): string[] => byKey.get(`${k.strategy}:${k.value}`) ?? []

  // 4. Plan + diff
  let planned: PlannedRow[] = planImport(normalized, lookup)
  planned = applyDiffs(planned, candidates)
  const counts = countRows(planned)

  if (mode === 'dry_run') {
    return json({ mode, counts, rows: planned })
  }

  // 5. Commit — one transactional RPC call, admin-guarded in the database
  const toApply = planned
    .filter((r) => r.action === 'new' || r.action === 'updated')
    .map((r) => ({
      row_number: r.row_number,
      match_id: r.match_id,
      fields: r.fields as CanonicalLead,
    }))

  if (!toApply.length) return json({ mode, counts, rows: planned, applied: [] })

  const { data: applied, error: applyError } = await supabase.rpc('admin_apply_lead_import', {
    p_rows: toApply,
  })
  if (applyError) return json({ error: `import failed: ${applyError.message}`, counts }, 500)

  return json({ mode, counts, rows: planned, applied })
})
