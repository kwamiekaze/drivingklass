import { supabase } from '@/integrations/supabase/client';
import type { LevelResult } from './game/types';

/**
 * Fire-and-forget: upserts the signed-in user's score for a level,
 * only overwriting if the new score is higher (personal best).
 * Silently no-ops if the user is signed out.
 */
export async function submitScore(result: LevelResult): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;

  // Resolve a friendly display name: profiles.full_name -> email prefix -> 'Driver'
  let displayName: string | null = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (profile) {
      const composed = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      displayName =
        profile.full_name?.trim() ||
        composed ||
        (profile.email ? profile.email.split('@')[0] : null);
    }
  } catch {
    /* ignore, fall back below */
  }
  if (!displayName) {
    displayName = user.email ? user.email.split('@')[0] : 'Driver';
  }

  // Fetch current best; only overwrite when new score is strictly higher.
  const { data: existing } = await supabase
    .from('game_scores')
    .select('score')
    .eq('user_id', user.id)
    .eq('level_id', result.levelId)
    .maybeSingle();

  if (existing && existing.score >= result.score) return;

  await supabase
    .from('game_scores')
    .upsert(
      {
        user_id: user.id,
        display_name: displayName,
        level_id: result.levelId,
        score: result.score,
        grade: result.grade,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,level_id' }
    );
}
