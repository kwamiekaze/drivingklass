// Admin-only marketing campaign engine (Resend marketing API).
// Completely separate from the transactional email queue — no transactional path is touched.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const RESEND_KEY =
  Deno.env.get('RESEND_MARKETING_API_KEY') || Deno.env.get('RESEND_API_KEY') || ''
const MARKETING_DOMAIN = 'mail.drivingklass.com'
const SITE_URL = 'https://drivingklass.com'

const BATCH_SIZE = 20
const BATCH_DELAY_MS = 600 // provider rate-limit friendly (<2 req/s bursts)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const isValidEmail = (v: string | null | undefined) => !!v && EMAIL_RE.test(v.trim())

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function linkify(text: string) {
  return escapeHtml(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    (m) => `<a href="${m}" style="color:#b8860b;font-weight:600;">${m}</a>`,
  )
}

function renderHtml(opts: {
  subject: string
  body: string
  greetingName?: string | null
  unsubscribeUrl: string
  businessName: string
  businessAddress: string
}) {
  const lines = opts.body.split('\n')
  // Personalise a leading bare "Hi," greeting when we know a first name.
  if (opts.greetingName && lines.length && /^hi,?\s*$/i.test(lines[0].trim())) {
    lines[0] = `Hi ${opts.greetingName},`
  }
  const paragraphs = lines
    .map((l) => l.trim())
    .map((l) => (l ? `<p style="margin:0 0 14px;line-height:1.6;">${linkify(l)}</p>` : ''))
    .join('')

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#1c1917;">
<tr><td style="background:#0c0a09;padding:20px 24px;">
  <span style="color:#d4af37;font-size:20px;font-weight:700;letter-spacing:1px;">DRIVING KLASS</span>
</td></tr>
<tr><td style="padding:26px 24px;font-size:15px;">
  <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(opts.subject)}</h1>
  ${paragraphs}
</td></tr>
<tr><td style="padding:18px 24px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;line-height:1.6;">
  <p style="margin:0 0 6px;">${escapeHtml(opts.businessName)}<br/>${escapeHtml(opts.businessAddress)}</p>
  <p style="margin:0;">You are receiving this because you contacted or enrolled with Driving Klass.
  <a href="${opts.unsubscribeUrl}" style="color:#78716c;text-decoration:underline;">Unsubscribe</a>.</p>
</td></tr>
</table></td></tr></table></body></html>`
}

function genToken() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function checkDomainVerified(): Promise<{ verified: boolean; detail: string }> {
  if (!RESEND_KEY) return { verified: false, detail: 'No marketing API key configured' }
  try {
    const r = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${RESEND_KEY}` },
    })
    const body = await r.text()
    if (!r.ok) return { verified: false, detail: `Resend domains lookup failed [${r.status}]: ${body}` }
    const parsed = JSON.parse(body)
    const list = parsed?.data ?? []
    const match = list.find((d: { name?: string }) => d?.name === MARKETING_DOMAIN)
    if (!match) return { verified: false, detail: `${MARKETING_DOMAIN} is not registered in Resend` }
    return {
      verified: match.status === 'verified',
      detail: `${MARKETING_DOMAIN} status: ${match.status}`,
    }
  } catch (e) {
    return { verified: false, detail: (e as Error).message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // ---- Server-side admin authorization (required for EVERY action) ----
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Missing authorization' }, 401)

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  const user = userData?.user
  if (userErr || !user) return json({ error: 'Invalid session' }, 401)

  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!isAdmin) return json({ error: 'Admin access required' }, 403)

  let body: Record<string, any> = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const action: string = body.action

  const { data: settings } = await admin.from('marketing_settings').select('*').eq('id', 1).maybeSingle()
  const fromEmail = settings?.from_email || `connect@${MARKETING_DOMAIN}`
  const fromName = settings?.from_name || 'Driving Klass'
  const replyTo = settings?.reply_to || 'connect@drivingklass.com'
  const businessName = settings?.business_name || ''
  const businessAddress = settings?.business_address || ''

  async function readiness() {
    const domain = await checkDomainVerified()
    const blockers: string[] = []
    if (!RESEND_KEY) blockers.push('Marketing provider key missing (add RESEND_MARKETING_API_KEY in Project Settings → Secrets)')
    if (!domain.verified) blockers.push(`Marketing domain not verified — ${domain.detail}`)
    if (!businessName || !businessAddress) blockers.push('Business name and physical mailing address are not configured in marketing settings (required for the marketing footer)')
    return {
      hasKey: !!RESEND_KEY,
      keyName: Deno.env.get('RESEND_MARKETING_API_KEY') ? 'RESEND_MARKETING_API_KEY' : (Deno.env.get('RESEND_API_KEY') ? 'RESEND_API_KEY' : null),
      domainVerified: domain.verified,
      domainDetail: domain.detail,
      marketingDomain: MARKETING_DOMAIN,
      fromEmail, fromName, replyTo,
      businessName, businessAddress,
      canSendLive: blockers.length === 0,
      blockers,
    }
  }

  // ---- Resolve eligible recipients from selected leads ----
  async function resolveRecipients(leadIds: string[], audience: string) {
    const counts = {
      considered: 0, eligible: 0, duplicates: 0, invalid: 0,
      unsubscribed: 0, suppressed: 0, missingConsent: 0, revokedConsent: 0,
    }
    const eligible: { email: string; leadId: string; type: 'student' | 'guardian'; name: string | null }[] = []
    if (!leadIds.length) return { counts, eligible }

    const leads: any[] = []
    for (let i = 0; i < leadIds.length; i += 500) {
      const { data, error } = await admin
        .from('leads')
        .select('id, email, guardian_email, student_first_name, guardian_first_name, full_name, guardian_name, email_consent_status')
        .in('id', leadIds.slice(i, i + 500))
      if (error) throw new Error(error.message)
      leads.push(...(data || []))
    }

    const candidates: { email: string; leadId: string; type: 'student' | 'guardian'; name: string | null; consent: string }[] = []
    for (const l of leads) {
      if (audience === 'student' || audience === 'both') {
        candidates.push({ email: (l.email || '').trim(), leadId: l.id, type: 'student', name: l.student_first_name || (l.full_name || '').split(' ')[0] || null, consent: l.email_consent_status })
      }
      if (audience === 'guardian' || audience === 'both') {
        candidates.push({ email: (l.guardian_email || '').trim(), leadId: l.id, type: 'guardian', name: l.guardian_first_name || (l.guardian_name || '').split(' ')[0] || null, consent: l.email_consent_status })
      }
    }

    const withEmail = candidates.filter((c) => c.email.length > 0)
    counts.considered = withEmail.length

    const lower = [...new Set(withEmail.map((c) => c.email.toLowerCase()))]
    const suppressed = new Set<string>()
    const unsubscribed = new Set<string>()
    for (let i = 0; i < lower.length; i += 500) {
      const chunk = lower.slice(i, i + 500)
      const [s, u] = await Promise.all([
        admin.from('suppressed_emails').select('email').in('email', chunk),
        admin.from('email_unsubscribe_tokens').select('email, used_at').in('email', chunk).not('used_at', 'is', null),
      ])
      ;(s.data || []).forEach((r: any) => suppressed.add((r.email || '').toLowerCase()))
      ;(u.data || []).forEach((r: any) => unsubscribed.add((r.email || '').toLowerCase()))
    }

    const seen = new Set<string>()
    for (const c of withEmail) {
      const key = c.email.toLowerCase()
      if (!isValidEmail(c.email)) { counts.invalid++; continue }
      if (seen.has(key)) { counts.duplicates++; continue }
      seen.add(key)
      if (suppressed.has(key)) { counts.suppressed++; continue }
      if (unsubscribed.has(key)) { counts.unsubscribed++; continue }
      if (c.consent === 'revoked') { counts.revokedConsent++; continue }
      if (c.consent !== 'granted') { counts.missingConsent++; continue }
      counts.eligible++
      eligible.push({ email: c.email, leadId: c.leadId, type: c.type, name: c.name })
    }
    return { counts, eligible }
  }

  async function unsubscribeUrlFor(email: string) {
    const token = genToken()
    await admin.from('email_unsubscribe_tokens').insert({ token, email: email.toLowerCase() })
    return `${SITE_URL}/unsubscribe?token=${token}`
  }

  async function sendOne(to: string, subject: string, html: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
      }),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`[${res.status}] ${text}`)
    let id: string | null = null
    try { id = JSON.parse(text)?.id ?? null } catch { /* ignore */ }
    return id
  }

  // ---- Background-safe batch processor (resumable, cancellable) ----
  async function processCampaign(campaignId: string) {
    for (;;) {
      const { data: camp } = await admin.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle()
      if (!camp || camp.status === 'cancelled' || camp.status === 'paused') return
      const { data: batch } = await admin
        .from('email_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)

      if (!batch || batch.length === 0) {
        const { count: failed } = await admin.from('email_campaign_recipients')
          .select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'failed')
        await admin.from('email_campaigns').update({
          status: 'completed', completed_at: new Date().toISOString(), failed_count: failed || 0,
        }).eq('id', campaignId)
        return
      }

      for (const r of batch) {
        // Re-check cancellation between messages.
        const { data: fresh } = await admin.from('email_campaigns').select('status').eq('id', campaignId).maybeSingle()
        if (fresh?.status === 'cancelled') return

        await admin.from('email_campaign_recipients')
          .update({ status: 'sending', attempts: (r.attempts || 0) + 1 }).eq('id', r.id)
        try {
          const unsub = await unsubscribeUrlFor(r.email)
          const html = renderHtml({
            subject: camp.subject, body: camp.body_text, greetingName: r.display_name,
            unsubscribeUrl: unsub, businessName, businessAddress,
          })
          const messageId = await sendOne(r.email, camp.subject, html)
          await admin.from('email_campaign_recipients').update({
            status: 'sent', provider_message_id: messageId, sent_at: new Date().toISOString(), error_message: null,
          }).eq('id', r.id)
        } catch (e) {
          await admin.from('email_campaign_recipients').update({
            status: 'failed', error_message: (e as Error).message,
          }).eq('id', r.id)
        }
        await new Promise((res) => setTimeout(res, BATCH_DELAY_MS))
      }

      const [{ count: sent }, { count: failed }] = await Promise.all([
        admin.from('email_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'sent'),
        admin.from('email_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'failed'),
      ])
      await admin.from('email_campaigns').update({ sent_count: sent || 0, failed_count: failed || 0 }).eq('id', campaignId)
    }
  }

  try {
    switch (action) {
      case 'status':
        return json({ readiness: await readiness() })

      case 'preview': {
        const { counts } = await resolveRecipients(body.lead_ids || [], body.audience || 'both')
        const html = renderHtml({
          subject: body.subject || '',
          body: body.body_text || '',
          greetingName: 'Alex',
          unsubscribeUrl: `${SITE_URL}/unsubscribe?token=PREVIEW`,
          businessName: businessName || '[business name not configured]',
          businessAddress: businessAddress || '[physical mailing address not configured]',
        })
        return json({ counts, html, readiness: await readiness() })
      }

      case 'send_test': {
        if (!RESEND_KEY) return json({ error: 'Marketing provider key missing (RESEND_MARKETING_API_KEY)' }, 412)
        const domain = await checkDomainVerified()
        if (!domain.verified) return json({ error: `Marketing domain not verified — ${domain.detail}` }, 412)
        const to = user.email
        if (!to) return json({ error: 'Signed-in admin has no email address' }, 400)
        const unsub = await unsubscribeUrlFor(to)
        const html = renderHtml({
          subject: body.subject || '', body: body.body_text || '', greetingName: null,
          unsubscribeUrl: unsub,
          businessName: businessName || 'Driving Klass',
          businessAddress: businessAddress || '[physical mailing address not configured]',
        })
        const id = await sendOne(to, `[TEST] ${body.subject || ''}`, html)
        return json({ ok: true, to, provider_message_id: id })
      }

      case 'create': {
        const idempotencyKey: string = body.idempotency_key
        if (!idempotencyKey) return json({ error: 'idempotency_key is required' }, 400)

        const { data: existing } = await admin.from('email_campaigns')
          .select('id').eq('idempotency_key', idempotencyKey).maybeSingle()
        if (existing) return json({ campaign_id: existing.id, deduped: true })

        const audience = body.audience || 'both'
        const { counts, eligible } = await resolveRecipients(body.lead_ids || [], audience)

        const { data: camp, error: campErr } = await admin.from('email_campaigns').insert({
          created_by: user.id,
          name: body.name || null,
          subject: body.subject,
          body_text: body.body_text,
          audience,
          filter_snapshot: body.filter_snapshot || { lead_ids: (body.lead_ids || []).length, counts },
          from_email: fromEmail, from_name: fromName, reply_to: replyTo,
          status: 'draft',
          total_recipients: counts.eligible,
          skipped_count: counts.considered - counts.eligible,
          idempotency_key: idempotencyKey,
        }).select('id').single()
        if (campErr) throw new Error(campErr.message)

        for (let i = 0; i < eligible.length; i += 500) {
          const rows = eligible.slice(i, i + 500).map((e) => ({
            campaign_id: camp.id, lead_id: e.leadId, email: e.email,
            recipient_type: e.type, display_name: e.name, status: 'pending',
          }))
          const { error } = await admin.from('email_campaign_recipients').upsert(rows, {
            onConflict: 'campaign_id,email', ignoreDuplicates: true,
          })
          if (error) throw new Error(error.message)
        }
        return json({ campaign_id: camp.id, counts })
      }

      case 'confirm': {
        const ready = await readiness()
        if (!ready.canSendLive) return json({ error: 'Live sending is blocked', blockers: ready.blockers }, 412)

        const campaignId = body.campaign_id
        const { data: camp } = await admin.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle()
        if (!camp) return json({ error: 'Campaign not found' }, 404)
        if (camp.status !== 'draft') return json({ error: `Campaign already ${camp.status}` }, 409)
        if (camp.total_recipients > 100 && body.confirmation_phrase !== `SEND ${camp.total_recipients}`) {
          return json({ error: `Confirmation phrase must be "SEND ${camp.total_recipients}"` }, 400)
        }
        // Atomic-ish double-submit guard: only one transition out of draft wins.
        const { data: claimed } = await admin.from('email_campaigns')
          .update({ status: 'sending', started_at: new Date().toISOString() })
          .eq('id', campaignId).eq('status', 'draft').select('id')
        if (!claimed || claimed.length === 0) return json({ error: 'Campaign already started' }, 409)

        // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
        EdgeRuntime.waitUntil(processCampaign(campaignId))
        return json({ ok: true, campaign_id: campaignId, status: 'sending' })
      }

      case 'cancel': {
        const { error } = await admin.from('email_campaigns')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: user.id })
          .eq('id', body.campaign_id).in('status', ['draft', 'sending', 'paused'])
        if (error) throw new Error(error.message)
        await admin.from('email_campaign_recipients')
          .update({ status: 'cancelled' }).eq('campaign_id', body.campaign_id).eq('status', 'pending')
        return json({ ok: true })
      }

      case 'retry': {
        const ready = await readiness()
        if (!ready.canSendLive) return json({ error: 'Live sending is blocked', blockers: ready.blockers }, 412)
        await admin.from('email_campaign_recipients')
          .update({ status: 'pending', error_message: null })
          .eq('campaign_id', body.campaign_id).eq('status', 'failed')
        await admin.from('email_campaigns')
          .update({ status: 'sending', completed_at: null }).eq('id', body.campaign_id)
        // @ts-ignore
        EdgeRuntime.waitUntil(processCampaign(body.campaign_id))
        return json({ ok: true })
      }

      case 'resume': {
        const ready = await readiness()
        if (!ready.canSendLive) return json({ error: 'Live sending is blocked', blockers: ready.blockers }, 412)
        const { data: camp } = await admin.from('email_campaigns').select('status').eq('id', body.campaign_id).maybeSingle()
        if (!camp || camp.status === 'cancelled') return json({ error: 'Campaign not resumable' }, 409)
        await admin.from('email_campaigns').update({ status: 'sending' }).eq('id', body.campaign_id)
        // @ts-ignore
        EdgeRuntime.waitUntil(processCampaign(body.campaign_id))
        return json({ ok: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (e) {
    console.error('admin-marketing-campaign error:', e)
    return json({ error: (e as Error).message }, 500)
  }
})
