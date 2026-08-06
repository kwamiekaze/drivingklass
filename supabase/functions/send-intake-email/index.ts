// Caller-authenticated function for staff/admin: sends intake-converted or intake-accepted emails.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const sk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ak = Deno.env.get('SUPABASE_ANON_KEY')!
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const user = createClient(url, ak, { global: { headers: { Authorization: auth } } })
    const { data: { user: caller } } = await user.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(url, sk)
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', caller.id).in('role', ['admin', 'staff']).maybeSingle()
    if (!role) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { kind, profile_id, email, recipient_name } = await req.json()
    if (!['intake-converted', 'intake-accepted'].includes(kind)) {
      return new Response(JSON.stringify({ error: 'invalid kind' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let recipientEmail = email
    let recipientName = recipient_name
    if (!recipientEmail && profile_id) {
      const { data: p } = await admin.from('profiles').select('email,first_name,full_name,email_prefs').eq('id', profile_id).maybeSingle()
      if (!p?.email) return new Response(JSON.stringify({ error: 'no email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const prefs = (p.email_prefs as any) || {}
      if (prefs.intake_status === false) return new Response(JSON.stringify({ skip: 'pref off' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      recipientEmail = p.email
      recipientName = greetingName(recipientName, p.first_name, p.full_name)
    }

    const r = await fetch(`${url}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdWFkdWRxdGNtcGRiZ3RnYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTI0MzMsImV4cCI6MjA4Mjc2ODQzM30.5aVbC2cnmJqVmiuO9wiJU3zQyLByWKhT2z8UHBp6_-Y` },
      body: JSON.stringify({
        templateName: kind,
        recipientEmail,
        idempotencyKey: `${kind}-${profile_id || recipientEmail}-${Date.now()}`,
        templateData: { recipientName },
      }),
    })
    const out = await r.json().catch(() => ({}))
    return new Response(JSON.stringify({ ok: true, send: out }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
