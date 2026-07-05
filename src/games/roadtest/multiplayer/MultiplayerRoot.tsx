import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MultiplayerLobby } from './MultiplayerLobby';
import { MultiplayerGame } from './MultiplayerGame';
import { Podium } from './Podium';
import type { CarColor, MatchRow, PlayerRow } from './types';

interface Props { onExit: () => void; }
type Phase = 'lobby' | 'playing' | 'podium';

interface Standing { uid: string; displayName: string; color: CarColor; stars: number }

export function MultiplayerRoot({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [me, setMe] = useState<PlayerRow | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);

  const enterMatch = useCallback((m: MatchRow, ps: PlayerRow[], meRow: PlayerRow) => {
    (async () => {
      const { data } = await supabase.from('game_match_players').select('*').eq('match_id', m.id);
      const fresh = ((data as PlayerRow[] | null) ?? ps).filter((p, i, arr) => arr.findIndex((x) => x.user_id === p.user_id) === i);
      setMatch(m); setPlayers(fresh.length ? fresh : ps); setMe(meRow); setPhase('playing');
    })();
  }, []);

  const onFinish = useCallback((s: Standing[]) => {
    setStandings(s);
    setPhase('podium');
  }, []);

  const onRematch = useCallback((nextMatch: MatchRow) => {
    setMatch(nextMatch);
    setStandings([]);
    setPhase('playing');
  }, []);

  const onMenu = useCallback(() => {
    setMatch(null); setPlayers([]); setMe(null); setStandings([]);
    setPhase('lobby');
    onExit();
  }, [onExit]);

  // Also react if host restarts match while we're on podium (subscribe)
  useEffect(() => {
    if (!match || phase !== 'podium') return;
    const ch = supabase
      .channel(`match-status:${match.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_matches', filter: `id=eq.${match.id}` },
        (payload) => {
          const row = payload.new as MatchRow;
          if (row.status === 'playing' && row.seed !== match.seed) {
            setMatch(row);
            setPhase('playing');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [match, phase]);

  if (phase === 'lobby') {
    return <MultiplayerLobby onEnterMatch={enterMatch} onBack={onExit} />;
  }
  if (phase === 'playing' && match && me) {
    return <MultiplayerGame key={match.seed} match={match} players={players} me={me} onFinish={onFinish} />;
  }
  if (phase === 'podium' && match && me) {
    return <Podium match={match} meUid={me.user_id} standings={standings} onRematch={onRematch} onMenu={onMenu} />;
  }
  return null;
}
