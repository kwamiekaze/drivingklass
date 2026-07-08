/** Public leaderboard submissions (daily challenge + endless). Additive only. */
import { supabase } from '@/integrations/supabase/client';
import { sanitizePlayerName } from './playerName';

export interface SubmitLeaderboardArgs {
  mode: 'daily' | 'endless';
  levelId: string;
  score: number;
  playerName: string;
  day?: string | null;
  rankTier?: string | null;
}

export async function submitLeaderboard(args: SubmitLeaderboardArgs) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const player_name = sanitizePlayerName(args.playerName);
    await supabase.from('game_leaderboard_entries').insert({
      user_id: userRes.user?.id ?? null,
      player_name,
      mode: args.mode,
      level_id: args.levelId,
      score: Math.max(0, Math.floor(args.score)),
      day: args.day ?? null,
      rank_tier: args.rankTier ?? null,
    });
  } catch (e) {
    console.error('submitLeaderboard', e);
  }
}

export interface LeaderboardRow {
  id: string;
  player_name: string;
  score: number;
  user_id: string | null;
  created_at: string;
  rank_tier: string | null;
}

export async function fetchLeaderboard(mode: 'daily' | 'endless', opts: { day?: string; sinceIso?: string; limit?: number } = {}): Promise<LeaderboardRow[]> {
  const limit = opts.limit ?? 50;
  let q = supabase
    .from('game_leaderboard_entries')
    .select('id, player_name, score, user_id, created_at, rank_tier')
    .eq('mode', mode)
    .order('score', { ascending: false })
    .limit(limit);
  if (mode === 'daily' && opts.day) q = q.eq('day', opts.day);
  if (opts.sinceIso) q = q.gte('created_at', opts.sinceIso);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return (data ?? []) as LeaderboardRow[];
}
