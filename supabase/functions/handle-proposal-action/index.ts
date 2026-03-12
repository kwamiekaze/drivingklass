import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Business timezone for DrivingKlass
const BUSINESS_TZ = 'America/New_York';

function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr);
  if (!match) throw new Error(`Invalid proposed_date format: ${dateStr}`);
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function parseTimeParts(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':');
  if (parts.length < 2) throw new Error(`Invalid time format: ${timeStr}`);
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time value: ${timeStr}`);
  }
  return { hour, minute };
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
}

/**
 * Deterministically converts a local America/New_York date+time to a UTC ISO instant.
 * This avoids ambiguous Date parsing and keeps proposal->session mapping exact.
 */
function toEasternISO(dateStr: string, timeStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const { hour, minute } = parseTimeParts(timeStr);

  // Start with a UTC guess and converge so that formatted NY local components match target.
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const targetKey = Date.UTC(year, month - 1, day, hour, minute, 0) / 60000;

  for (let i = 0; i < 3; i++) {
    const local = zonedParts(candidate, BUSINESS_TZ);
    const localKey = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0) / 60000;
    const diffMinutes = targetKey - localKey;
    if (diffMinutes === 0) break;
    candidate = new Date(candidate.getTime() + diffMinutes * 60_000);
  }

  return candidate.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Not authenticated')

    const body = await req.json()
    const { action, proposal_id, reason } = body

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    const userRole = roleData?.role || 'student'

    if (action === 'accept') {
      return await handleAccept(supabase, user.id, userRole, proposal_id)
    } else if (action === 'decline') {
      return await handleDecline(supabase, user.id, userRole, proposal_id, reason)
    } else if (action === 'finalize') {
      return await handleFinalize(supabase, user.id, userRole, proposal_id, 'pending_admin_finalize')
    } else if (action === 'finalize_edited') {
      return await handleFinalize(supabase, user.id, userRole, proposal_id, 'proposed')
    } else {
      throw new Error('Invalid action')
    }
  } catch (error: any) {
    console.error('[handle-proposal-action] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Create a real session from a proposal item, using exact timezone-aware timestamps.
 * Returns the created session or null if conflict/error.
 */
async function createSessionFromItem(
  supabase: any,
  item: any,
  proposal: any,
  createdBy: string,
): Promise<{ session: any | null; conflict: boolean; error?: string }> {
  const startsAtISO = toEasternISO(item.proposed_date, item.start_time);
  const endsAtISO = toEasternISO(item.proposed_date, item.end_time);

  console.log(`[schedule] Item ${item.id}: proposed_date=${item.proposed_date} start=${item.start_time} end=${item.end_time} -> starts_at=${startsAtISO} ends_at=${endsAtISO}`);

  // Check conflicts using the exact timestamps
  const { data: conflicts } = await supabase
    .from('sessions')
    .select('id')
    .neq('status', 'cancelled')
    .or(`instructor_id.eq.${proposal.instructor_id},student_id.eq.${proposal.student_id}`)
    .lt('starts_at', endsAtISO)
    .gt('ends_at', startsAtISO)

  if (conflicts && conflicts.length > 0) {
    return { session: null, conflict: true, error: 'Time slot conflict with existing session' };
  }

  const durationMinutes = item.duration_minutes || 120;

  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .insert({
      student_id: proposal.student_id,
      instructor_id: proposal.instructor_id,
      starts_at: startsAtISO,
      ends_at: endsAtISO,
      duration_minutes: durationMinutes,
      status: 'scheduled',
      session_type: item.session_type || 'driving',
      pickup_address: item.pickup_address,
      dropoff_address: item.dropoff_address,
      created_by: createdBy,
    })
    .select()
    .single()

  if (sErr) {
    console.error(`[schedule] Failed to create session for item ${item.id}:`, sErr.message);
    return { session: null, conflict: false, error: sErr.message };
  }

  console.log(`[schedule] Created session ${session.id} for item ${item.id}: starts_at=${session.starts_at} ends_at=${session.ends_at}`);
  return { session, conflict: false };
}

async function handleAccept(supabase: any, userId: string, userRole: string, proposalId: string) {
  const { data: proposal, error: pErr } = await supabase
    .from('schedule_proposals')
    .select('*')
    .eq('id', proposalId)
    .single()
  if (pErr || !proposal) throw new Error('Proposal not found')
  if (proposal.student_id !== userId) throw new Error('Not authorized')
  if (!['sent', 'revised_and_resent'].includes(proposal.proposal_status)) throw new Error('Proposal is no longer available')

  const { data: items } = await supabase
    .from('schedule_proposal_items')
    .select('*')
    .eq('proposal_id', proposalId)
    .eq('item_status', 'proposed')
    .order('proposed_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (!items || items.length === 0) throw new Error('No proposal items found')

  if (proposal.acceptance_mode === 'auto_schedule_on_accept') {
    const results = { scheduled: 0, conflicts: 0, conflictItems: [] as string[] }

    for (const item of items) {
      const { session, conflict, error } = await createSessionFromItem(supabase, item, proposal, userId);

      if (conflict || !session) {
        await supabase.from('schedule_proposal_items')
          .update({ item_status: 'conflict', conflict_reason: error || 'Time slot conflict' })
          .eq('id', item.id)
        results.conflicts++
        continue
      }

      await supabase.from('schedule_proposal_items')
        .update({ item_status: 'auto_scheduled', created_session_id: session.id })
        .eq('id', item.id)
      results.scheduled++
    }

    const newStatus = results.conflicts > 0 && results.scheduled > 0
      ? 'partially_scheduled'
      : results.scheduled > 0 ? 'auto_scheduled' : 'conflict'

    await supabase.from('schedule_proposals')
      .update({ proposal_status: newStatus, accepted_at: new Date().toISOString() })
      .eq('id', proposalId)

    const { data: studentProfile } = await supabase.from('profiles').select('full_name, email').eq('id', proposal.student_id).single()
    const studentName = studentProfile?.full_name || studentProfile?.email || 'Student'

    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'staff'])
    if (adminRoles) {
      for (const ar of adminRoles) {
        await supabase.from('notifications').insert({
          user_id: ar.user_id,
          title: 'Schedule Auto-Scheduled',
          message: `${studentName} accepted a proposed schedule and ${results.scheduled} session(s) were automatically scheduled.`,
          type: 'schedule', severity: 'info', link: '/admin/proposals',
        })
      }
    }

    await supabase.from('notifications').insert({
      user_id: proposal.instructor_id,
      title: 'Proposal Accepted',
      message: `${studentName} accepted your proposed schedule. ${results.scheduled} session(s) were scheduled.`,
      type: 'schedule', severity: 'info', link: '/instructor',
    })

    return new Response(JSON.stringify({
      success: true, mode: 'auto_scheduled', scheduled: results.scheduled, conflicts: results.conflicts,
      message: 'Your schedule has been updated.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } else {
    await supabase.from('schedule_proposal_items')
      .update({ item_status: 'pending_admin_finalize' })
      .eq('proposal_id', proposalId)
      .eq('item_status', 'proposed')

    await supabase.from('schedule_proposals')
      .update({ proposal_status: 'pending_admin_finalize', accepted_at: new Date().toISOString() })
      .eq('id', proposalId)

    const { data: studentProfile } = await supabase.from('profiles').select('full_name, email').eq('id', proposal.student_id).single()
    const studentName = studentProfile?.full_name || studentProfile?.email || 'Student'

    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'staff'])
    if (adminRoles) {
      for (const ar of adminRoles) {
        await supabase.from('notifications').insert({
          user_id: ar.user_id,
          title: 'Schedule Accepted — Pending Finalization',
          message: `${studentName} accepted a proposed schedule. Pending admin finalization.`,
          type: 'schedule', severity: 'warning', link: '/admin/proposals',
        })
      }
    }

    return new Response(JSON.stringify({
      success: true, mode: 'pending_admin_finalize', itemCount: items.length,
      message: 'Your proposed schedule has been accepted and your dates are now pending. Please make your payment to finalize your schedule. If you already made payment, please call/text us so your schedule can be scheduled immediately.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}

async function handleDecline(supabase: any, userId: string, userRole: string, proposalId: string, reason?: string) {
  const { data: proposal } = await supabase.from('schedule_proposals').select('*').eq('id', proposalId).single()
  if (!proposal) throw new Error('Proposal not found')
  if (proposal.student_id !== userId) throw new Error('Not authorized')

  await supabase.from('schedule_proposals')
    .update({ proposal_status: 'declined', declined_at: new Date().toISOString() })
    .eq('id', proposalId)

  await supabase.from('schedule_proposal_items')
    .update({ item_status: 'declined' })
    .eq('proposal_id', proposalId)

  const { data: studentProfile } = await supabase.from('profiles').select('full_name, email').eq('id', proposal.student_id).single()
  const studentName = studentProfile?.full_name || studentProfile?.email || 'Student'

  await supabase.from('notifications').insert({
    user_id: proposal.instructor_id,
    title: 'Proposal Declined',
    message: `${studentName} has declined the proposed schedule.${reason ? ' Reason: ' + reason : ''}`,
    type: 'schedule', severity: 'warning', link: '/instructor',
  })

  return new Response(JSON.stringify({ success: true, message: 'Proposal declined.' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleFinalize(supabase: any, userId: string, userRole: string, proposalId: string, targetItemStatus: string) {
  if (!['admin', 'staff'].includes(userRole)) throw new Error('Only admins can finalize proposals')

  const { data: proposal } = await supabase.from('schedule_proposals').select('*').eq('id', proposalId).single()
  if (!proposal) throw new Error('Proposal not found')

  const { data: items } = await supabase
    .from('schedule_proposal_items')
    .select('*')
    .eq('proposal_id', proposalId)
    .eq('item_status', targetItemStatus)

  if (!items || items.length === 0) throw new Error('No items to finalize')

  let scheduled = 0
  let conflicts = 0

  for (const item of items) {
    const { session, conflict, error } = await createSessionFromItem(supabase, item, proposal, userId);

    if (conflict || !session) {
      await supabase.from('schedule_proposal_items')
        .update({ item_status: 'conflict', conflict_reason: error || 'Time slot conflict' })
        .eq('id', item.id)
      conflicts++
      continue
    }

    await supabase.from('schedule_proposal_items')
      .update({ item_status: 'finalized', created_session_id: session.id })
      .eq('id', item.id)
    scheduled++
  }

  const finalStatus = targetItemStatus === 'proposed' ? 'revised_and_finalized' : 
    (conflicts > 0 && scheduled > 0 ? 'partially_finalized' : scheduled > 0 ? 'finalized' : 'conflict')

  await supabase.from('schedule_proposals')
    .update({ proposal_status: finalStatus, finalized_at: new Date().toISOString() })
    .eq('id', proposalId)

  // Mark edit requests as finalized
  await supabase.from('proposal_edit_requests')
    .update({ status: 'finalized', resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('proposal_id', proposalId)
    .eq('status', 'open')

  // Notify student
  await supabase.from('notifications').insert({
    user_id: proposal.student_id,
    title: 'Schedule Updated',
    message: `Your schedule has been updated. ${scheduled} session(s) have been finalized.`,
    type: 'schedule', severity: 'info', link: '/student',
  })

  const { data: studentProfile } = await supabase.from('profiles').select('full_name').eq('id', proposal.student_id).single()
  await supabase.from('notifications').insert({
    user_id: proposal.instructor_id,
    title: 'Schedule Finalized',
    message: `${scheduled} session(s) for ${studentProfile?.full_name || 'student'} have been finalized.`,
    type: 'schedule', severity: 'info', link: '/instructor',
  })

  return new Response(JSON.stringify({ success: true, scheduled, conflicts }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
