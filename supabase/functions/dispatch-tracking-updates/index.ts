// Scheduled dispatcher: sends interval "Location Update" emails to guardians
// for every active tracking row whose next-email-window has elapsed.
// Invoked by pg_cron every ~5 minutes.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { profileFirstName, guardianFirstName } from '../_shared/names.ts'

const SITE_URL = 'https://drivingklass.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, serviceKey)

  const nowIso = new Date().toISOString()

  // Fetch active tracking rows and their sessions.
  const { data: rows, error } = await supabase
    .from('session_tracking')
    .select('id, guardian_email, update_interval_minutes, started_at, last_email_sent_at, is_active, student_id, session_id, session:sessions!session_tracking_session_id_fkey(status, starts_at, ends_at)')
    .eq('is_active', true)

  if (error) {
    console.error('dispatch-tracking-updates fetch error', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let sent = 0
  let ended = 0
  for (const r of rows || []) {
    const sess: any = (r as any).session
    // Auto-end if session already completed/cancelled
    if (!sess || sess.status === 'completed' || sess.status === 'cancelled') {
      await supabase.from('session_tracking').update({ is_active: false, ended_at: nowIso }).eq('id', r.id)
      ended++
      continue
    }
    const interval = r.update_interval_minutes || 30
    const lastMs = r.last_email_sent_at ? new Date(r.last_email_sent_at).getTime() : new Date(r.started_at).getTime()
    const dueAt = lastMs + interval * 60_000
    if (Date.now() < dueAt) continue

    // Look up student first name + guardian name via profiles
    const { data: sp } = await supabase.from('profiles').select('first_name, full_name, guardian_name').eq('id', r.student_id).maybeSingle()
    const studentName = profileFirstName(sp as any) || 'your student'
    const guardianName = guardianFirstName(sp as any)

    // Look up latest tracking snapshot for label
    const { data: t } = await supabase.from('session_tracking').select('last_location_at, tracking_token').eq('id', r.id).maybeSingle()
    const lastUpdatedLabel = t?.last_location_at
      ? new Date(t.last_location_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'not yet received'

    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'tracking-update',
          recipientEmail: r.guardian_email,
          idempotencyKey: `tracking-update-${r.id}-${Math.floor(Date.now() / 60000)}`,
          templateData: {
            studentName,
            guardianName,
            sessionStatus: sess.status,
            lastUpdatedLabel,
            intervalMinutes: interval,
            trackingUrl: `${SITE_URL}/tracker/${t?.tracking_token}`,
          },
        },
      })
      await supabase.from('session_tracking').update({ last_email_sent_at: nowIso }).eq('id', r.id)
      sent++
    } catch (e) {
      console.error('send interval failed', r.id, e)
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, ended, scanned: rows?.length || 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
