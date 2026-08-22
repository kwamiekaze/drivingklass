// Central recipient resolution for ALL student-facing transactional email.
// A student account can have secondary (alias) email addresses attached by an
// admin — every email addressed to the primary must also reach those aliases.
// Implemented here so every template inherits the behaviour automatically.

/** Lowercase + trim, returning '' for empty values. */
export function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

/** Case-insensitive dedupe that preserves the first-seen casing. */
export function dedupeEmails(emails: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of emails) {
    const value = String(raw || '').trim()
    const key = value.toLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

/**
 * Given the intended recipient email, return that address plus any linked
 * secondary addresses (deduped, case-insensitive). Falls back to just the
 * original address if anything goes wrong — email must never be blocked by
 * alias resolution.
 */
export async function resolveRecipientEmails(
  supabase: any,
  recipientEmail: string,
): Promise<string[]> {
  const primary = String(recipientEmail || '').trim()
  if (!primary) return []
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', primary)
      .maybeSingle()
    if (!profile?.id) return [primary]

    // Resolve to the canonical account first (in case the mail was addressed
    // to a secondary address), then collect every alias of that account.
    const { data: asAlias } = await supabase
      .from('account_links')
      .select('canonical_user_id')
      .eq('alias_user_id', profile.id)
      .maybeSingle()
    const canonicalId = asAlias?.canonical_user_id || profile.id

    const { data: links } = await supabase
      .from('account_links')
      .select('alias_user_id')
      .eq('canonical_user_id', canonicalId)

    const ids = [canonicalId, ...(links || []).map((l: any) => l.alias_user_id)]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', ids)

    return dedupeEmails([primary, ...((profs || []).map((p: any) => p.email))])
  } catch (e) {
    console.error('[recipients] alias resolution failed, sending to primary only', e)
    return [primary]
  }
}
