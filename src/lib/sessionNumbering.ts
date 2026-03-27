/**
 * Compute session numbers for a student.
 * Sessions are numbered chronologically (oldest = Session 1).
 * Only non-cancelled sessions are numbered; cancelled sessions get null.
 */
export function computeSessionNumbers(
  sessions: Array<{ id: string; starts_at: string; status: string }>
): Map<string, number> {
  const map = new Map<string, number>();
  
  // Sort by starts_at ascending for chronological numbering
  const sorted = [...sessions]
    .filter(s => s.status !== 'cancelled')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  
  sorted.forEach((s, i) => {
    map.set(s.id, i + 1);
  });
  
  return map;
}

/**
 * Get a session label like "Session 3" or "Lesson 3"
 */
export function getSessionLabel(sessionNumber: number | undefined, prefix = 'Session'): string {
  if (!sessionNumber) return '';
  return `${prefix} ${sessionNumber}`;
}
