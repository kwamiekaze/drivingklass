import { supabase } from '@/integrations/supabase/client';
import type { LevelResult } from './game/types';

/**
 * Upserts personal best per user + level + difficulty for signed-in users.
 * Uses first + last name from the profile as the display name.
 */
export async function submitScore(
  result: LevelResult
): Promise<{ isNewBest: boolean; previousBest: number | null; isGuest: boolean }> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return { isNewBest: false, previousBest: null, isGuest: true };

  let displayName: string | null = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (profile) {
      const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
      displayName =
        composed ||
        profile.full_name?.trim() ||
        (profile.email ? profile.email.split('@')[0] : null);
    }
  } catch { /* ignore */ }
  if (!displayName) displayName = user.email ? user.email.split('@')[0] : 'Driver';

  const { data: existing } = await supabase
    .from('game_scores')
    .select('score')
    .eq('user_id', user.id)
    .eq('level_id', result.levelId)
    .eq('difficulty', result.difficulty)
    .maybeSingle();

  const previousBest = existing?.score ?? null;
  if (existing && existing.score >= result.score) {
    return { isNewBest: false, previousBest, isGuest: false };
  }

  await supabase.from('game_scores').upsert(
    {
      user_id: user.id,
      display_name: displayName,
      level_id: result.levelId,
      difficulty: result.difficulty,
      score: result.score,
      grade: result.grade,
      distance: result.distance ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,level_id,difficulty' }
  );

  return { isNewBest: true, previousBest, isGuest: false };
}
