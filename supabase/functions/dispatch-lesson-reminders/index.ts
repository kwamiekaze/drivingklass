// Cron-invoked: find upcoming sessions in 24h and 1h windows and email students.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }

function fmt(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'America/New_York' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }).format(d)
  return { date, time }
}

Deno.serve(async (_req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const results: any[] = []
  const now = new Date()

  const windows: Array<{ kind: '24h' | '1h'; lower: Date; upper: Date }> = [
    { kind: '24h', lower: new Date(now.getTime() + 23.75 * 3600 * 1000), upper: new Date(now.getTime() + 24.25 * 3600 * 1000) },
    { kind: '1h', lower: new Date(now.getTime() + 0.75 * 3600 * 1000), upper: new Date(now.getTime() + 1.25 * 3600 * 1000) },
  ]

  for (const w of windows) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, starts_at, duration_minutes, student_id, instructor_id, pickup_address, dropoff_address, status')
      .gte('starts_at', w.lower.toISOString())
      .lte('starts_at', w.upper.toISOString())
      .eq('status', 'scheduled')
    for (const s of sessions || []) {
      // Dedup
      const { data: already } = await supabase
        .from('lesson_reminder_sends')
        .select('id').eq('session_id', s.id).eq('kind', w.kind).maybeSingle()
      if (already) continue

      const { data: stu } = await supabase
        .from('profiles').select('email,first_name,full_name,email_prefs').eq('id', s.student_id).maybeSingle()
      if (!stu?.email) continue
      const prefs = (stu.email_prefs as any) || {}
      if (prefs.lesson_reminder === false) continue

      const { data: inst } = await supabase.from('profiles').select('first_name,full_name').eq('id', s.instructor_id).maybeSingle()
      const { date, time } = fmt(s.starts_at)

      const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdWFkdWRxdGNtcGRiZ3RnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTI0MzMsImV4cCI6MjA4Mjc2ODQzM30.5aVbC2cnmJqVmiuO9wiJU3zQyLByWKhT2z8UHBp6_-Y` },
        body: JSON.stringify({
          templateName: 'lesson-reminder',
          recipientEmail: stu.email,
          idempotencyKey: `reminder-${s.id}-${w.kind}`,
          templateData: {
            recipientName: profileFirstName(stu as any),
            dateLabel: date,
            timeLabel: time,
            instructorName: profileFirstName(inst as any),
            pickupAddress: s.pickup_address || undefined,
            dropoffAddress: s.dropoff_address || undefined,
            durationMinutes: s.duration_minutes,
            window: w.kind,
          },
        }),
      })
      const out = await r.json().catch(() => ({}))
      await supabase.from('lesson_reminder_sends').insert({ session_id: s.id, kind: w.kind })
      results.push({ session_id: s.id, kind: w.kind, send: out })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
