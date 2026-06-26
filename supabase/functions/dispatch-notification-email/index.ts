// Dispatch an email for a freshly inserted notification (if the user enabled it).
// Called by a DB trigger via pg_net.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }

const TYPE_TO_PREF: Record<string, string> = {
  session_created: 'lesson_scheduled',
  session_assigned: 'lesson_scheduled',
  schedule: 'lesson_scheduled',
  session_cancelled: 'lesson_cancelled',
  session_completed: 'lesson_scheduled',
  session_rescheduled: 'lesson_scheduled',
  report_card: 'report_card',
  report_card_posted: 'report_card',
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso)
    const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'America/New_York' }).format(d)
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }).format(d)
    return { date, time }
  } catch { return { date: '', time: '' } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const { notification_id } = await req.json()
    if (!notification_id) return new Response(JSON.stringify({ error: 'notification_id required' }), { status: 400 })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: notif } = await supabase.from('notifications').select('*').eq('id', notification_id).maybeSingle()
    if (!notif) return new Response(JSON.stringify({ skip: 'no notification' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const prefKey = TYPE_TO_PREF[notif.type]
    if (!prefKey) return new Response(JSON.stringify({ skip: 'no pref mapping' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: profile } = await supabase.from('profiles')
      .select('id,email,full_name,first_name,email_prefs')
      .eq('id', notif.user_id).maybeSingle()
    if (!profile?.email) return new Response(JSON.stringify({ skip: 'no email' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const prefs = (profile.email_prefs as any) || {}
    if (prefs[prefKey] === false) return new Response(JSON.stringify({ skip: 'pref off' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const recipientName = profile.first_name || profile.full_name || ''

    let templateName = ''
    let templateData: Record<string, any> = { recipientName }

    if (prefKey === 'lesson_scheduled' || prefKey === 'lesson_cancelled') {
      if (!notif.session_id) return new Response(JSON.stringify({ skip: 'no session' }), { status: 200 })
      const { data: s } = await supabase.from('sessions').select('*').eq('id', notif.session_id).maybeSingle()
      if (!s) return new Response(JSON.stringify({ skip: 'session missing' }), { status: 200 })
      const { date, time } = fmtDateTime(s.starts_at)
      const { data: stud } = await supabase.from('profiles').select('first_name,full_name').eq('id', s.student_id).maybeSingle()
      const { data: inst } = await supabase.from('profiles').select('first_name,full_name').eq('id', s.instructor_id).maybeSingle()
      const audience = notif.user_id === s.student_id ? 'student' : (notif.user_id === s.instructor_id ? 'instructor' : 'admin')
      templateData = {
        ...templateData,
        audience,
        dateLabel: date,
        timeLabel: time,
        durationMinutes: s.duration_minutes,
        instructorName: inst?.first_name || inst?.full_name || '',
        studentName: stud?.first_name || stud?.full_name || '',
        pickupAddress: s.pickup_address || undefined,
        reason: s.cancellation_reason || undefined,
        cancelledBy: s.cancelled_by_role || undefined,
        penaltyApplied: !!s.cancel_penalty_applied,
      }
      templateName = prefKey === 'lesson_cancelled' ? 'lesson-cancelled' : 'lesson-scheduled'
    } else if (prefKey === 'report_card') {
      templateName = 'report-card-submitted'
      if (notif.report_card_id) {
        const { data: rc } = await supabase.from('report_cards')
          .select('session_id,instructor_id,public_share_slug,public_access_code,is_public')
          .eq('id', notif.report_card_id).maybeSingle()
        if (rc) {
          const { data: inst } = await supabase.from('profiles').select('first_name,full_name').eq('id', rc.instructor_id).maybeSingle()
          templateData.instructorName = inst?.first_name || inst?.full_name || ''
          if (rc.is_public && rc.public_share_slug) {
            const siteUrl = Deno.env.get('SITE_URL') || 'https://drivingklass.com'
            templateData.publicUrl = `${siteUrl}/report/public/${rc.public_share_slug}`
          }
          if (rc.public_access_code) templateData.accessCode = rc.public_access_code
          if (rc.session_id) {
            const { data: s } = await supabase.from('sessions').select('starts_at').eq('id', rc.session_id).maybeSingle()
            if (s?.starts_at) templateData.dateLabel = fmtDateTime(s.starts_at).date
          }
        }
      }
    }

    if (!templateName) return new Response(JSON.stringify({ skip: 'no template' }), { status: 200 })

    // Invoke send function with service-role auth
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdWFkdWRxdGNtcGRiZ3RnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTI0MzMsImV4cCI6MjA4Mjc2ODQzM30.5aVbC2cnmJqVmiuO9wiJU3zQyLByWKhT2z8UHBp6_-Y`,
      },
      body: JSON.stringify({
        templateName,
        recipientEmail: profile.email,
        idempotencyKey: `notif-${notif.id}`,
        templateData,
      }),
    })
    const out = await res.json().catch(() => ({}))
    return new Response(JSON.stringify({ ok: true, send: out }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
