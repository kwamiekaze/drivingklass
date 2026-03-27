/**
 * Compute per-student session numbers from a list of sessions.
 * Non-cancelled sessions are numbered chronologically (by starts_at).
 * Returns a map of session_id → session number.
 */
export function computeSessionNumbers(
  sessions: Array<{ id: string; starts_at: string; status: string; student_id: string }>,
  studentId?: string
): Record<string, number> {
  // Filter to non-cancelled sessions for the given student (if provided)
  const filtered = sessions
    .filter(s => s.status !== 'cancelled' && (!studentId || s.student_id === studentId))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const map: Record<string, number> = {};
  filtered.forEach((s, i) => {
    map[s.id] = i + 1;
  });
  return map;
}

/**
 * For a single student, compute session numbers from fetched session data.
 * Useful in report card views where we need to look up a specific session's number.
 */
export async function fetchSessionNumberForStudent(
  supabase: any,
  studentId: string,
  sessionId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('sessions')
    .select('id, starts_at, status')
    .eq('student_id', studentId)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  if (!data) return null;
  const idx = data.findIndex((s: any) => s.id === sessionId);
  return idx >= 0 ? idx + 1 : null;
}
