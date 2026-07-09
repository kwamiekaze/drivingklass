// Send road test scheduling emails to both student and instructor,
// and log both sends to public.road_test_emails.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401)
  }
  // Require admin/staff
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userData.user.id)
  const isStaff = (roles || []).some((r: any) => r.role === 'admin' || r.role === 'staff')
  if (!isStaff) return json({ error: 'Forbidden' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { sessionId } = body || {}
  if (!sessionId) return json({ error: 'sessionId required' }, 400)

  // Load session with student + instructor
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, starts_at, dds_location, session_type, student_id, instructor_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (sErr || !session) return json({ error: 'Session not found' }, 404)
  if (session.session_type !== 'testing') return json({ error: 'Not a road test session' }, 400)
  if (!session.dds_location) return json({ error: 'DDS location missing' }, 400)

  const [{ data: student }, { data: instructor }] = await Promise.all([
    supabase.from('profiles').select('id, email, first_name, last_name, full_name').eq('id', session.student_id).maybeSingle(),
    supabase.from('profiles').select('id, email, first_name, last_name, full_name').eq('id', session.instructor_id).maybeSingle(),
  ])

  const name = (p: any) => p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'there'
  const studentName = name(student)
  const instructorName = name(instructor)
  const ddsLocation: string = session.dds_location
  const cityLabel = ddsLocation.split(' - ')[0] || ''

  // Format date/time in America/New_York
  const starts = new Date(session.starts_at)
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...opts }).format(starts)
  const dateLabel = fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeLabel = fmt({ hour: 'numeric', minute: '2-digit', hour12: true })

  async function send(templateName: string, recipientEmail: string, data: Record<string, any>, subjectFallback: string) {
    const idempotencyKey = `road-test-${templateName}-${sessionId}-${starts.getTime()}`
    let status = 'sent'
    let errorMessage: string | null = null
    let subject = subjectFallback
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName,
          recipientEmail,
          idempotencyKey,
          templateData: data,
        }),
      })
      if (!res.ok) {
        status = 'failed'
        errorMessage = `HTTP ${res.status}: ${await res.text()}`
      } else {
        const payload = await res.json().catch(() => ({}))
        if (payload?.subject) subject = payload.subject
      }
    } catch (e: any) {
      status = 'failed'
      errorMessage = e?.message || String(e)
    }
    // Log to road_test_emails (service role bypasses RLS)
    await supabase.from('road_test_emails').insert({
      session_id: sessionId,
      recipient_type: templateName.endsWith('-student') ? 'student' : 'instructor',
      recipient_email: recipientEmail,
      subject,
      body: JSON.stringify(data),
      status,
      error_message: errorMessage,
    })
    return { status, errorMessage }
  }

  const results: any = { student: null, instructor: null }
  if (student?.email) {
    results.student = await send(
      'road-test-scheduled-student',
      student.email,
      { studentName, ddsLocation, dateLabel, timeLabel },
      'Your DrivingKlass Road Test — How to Schedule on DDS 2 GO',
    )
  } else {
    results.student = { status: 'skipped', errorMessage: 'no student email' }
  }
  if (instructor?.email) {
    results.instructor = await send(
      'road-test-scheduled-instructor',
      instructor.email,
      { instructorName, studentName, ddsLocation, dateLabel, timeLabel, cityLabel },
      `Road Test Scheduled: ${studentName} — ${dateLabel} ${timeLabel} ${cityLabel}`,
    )
  } else {
    results.instructor = { status: 'skipped', errorMessage: 'no instructor email' }
  }

  return json({ ok: true, results })
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
