import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CAR_COLORS, type CarColor, type MatchRow, type PlayerRow } from './types';
import { sound } from '../sound';

interface Props {
  onEnterMatch: (match: MatchRow, players: PlayerRow[], me: PlayerRow) => void;
  onBack: () => void;
}

function makeCode(): string {
  const alph = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alph[Math.floor(Math.random() * alph.length)];
  return s;
}

async function getMe() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error('Not signed in');
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle();
  const composed = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const name = profile?.full_name?.trim() || composed || (user.email?.split('@')[0]) || 'Driver';
  return { id: user.id, name };
}

export function MultiplayerLobby({ onEnterMatch, onBack }: Props) {
  const [mode, setMode] = useState<'menu' | 'host' | 'join' | 'waiting'>('menu');
  const [duration, setDuration] = useState<120 | 180 | 300>(180);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [me, setMe] = useState<PlayerRow | null>(null);

  // Subscribe to lobby updates
  useEffect(() => {
    if (!match) return;
    const ch = supabase
      .channel(`lobby:${match.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_match_players', filter: `match_id=eq.${match.id}` },
        async () => {
          const { data } = await supabase.from('game_match_players').select('*').eq('match_id', match.id).order('joined_at');
          setPlayers((data as PlayerRow[]) ?? []);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_matches', filter: `id=eq.${match.id}` },
        (payload) => {
          const row = payload.new as MatchRow;
          setMatch(row);
          if (row.status === 'playing' && me) onEnterMatch(row, players, me);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [match?.id, players, me, onEnterMatch]);

  const hostCreate = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const meUser = await getMe();
      let code = makeCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabase.from('game_matches').select('id').eq('code', code).maybeSingle();
        if (!existing) break;
        code = makeCode();
      }
      const seed = Math.floor(Math.random() * 2_000_000_000);
      const { data: m, error: mErr } = await supabase
        .from('game_matches')
        .insert({ code, host_id: meUser.id, status: 'lobby', duration_s: duration, seed })
        .select().single();
      if (mErr || !m) throw mErr ?? new Error('Failed to create match');

      const { data: p, error: pErr } = await supabase
        .from('game_match_players')
        .insert({ match_id: m.id, user_id: meUser.id, display_name: meUser.name, color: CAR_COLORS[0], stars: 0 })
        .select().single();
      if (pErr || !p) throw pErr ?? new Error('Failed to join');

      setMatch(m as MatchRow);
      setPlayers([p as PlayerRow]);
      setMe(p as PlayerRow);
      setMode('waiting');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create match');
    } finally { setBusy(false); }
  }, [duration]);

  const joinByCode = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const meUser = await getMe();
      const code = codeInput.trim().toUpperCase();
      if (code.length !== 4) throw new Error('Enter a 4-character code');
      const { data: m } = await supabase.from('game_matches').select('*').eq('code', code).maybeSingle();
      if (!m) throw new Error('Match not found');
      if ((m as MatchRow).status !== 'lobby') throw new Error('Match already started');

      const { data: existingList } = await supabase.from('game_match_players').select('*').eq('match_id', m.id).order('joined_at');
      const existing = (existingList as PlayerRow[]) ?? [];
      if (existing.length >= 5 && !existing.some((p) => p.user_id === meUser.id)) throw new Error('Match is full');
      const takenColors = new Set(existing.map((p) => p.color));
      const myColor = (CAR_COLORS.find((c) => !takenColors.has(c)) ?? CAR_COLORS[0]) as CarColor;

      const { data: p, error: pErr } = await supabase
        .from('game_match_players')
        .upsert({ match_id: m.id, user_id: meUser.id, display_name: meUser.name, color: myColor, stars: 0 },
          { onConflict: 'match_id,user_id' })
        .select().single();
      if (pErr || !p) throw pErr ?? new Error('Failed to join');

      setMatch(m as MatchRow);
      setPlayers([...existing.filter((x) => x.user_id !== meUser.id), p as PlayerRow]);
      setMe(p as PlayerRow);
      setMode('waiting');
    } catch (e: any) {
      setError(e?.message ?? 'Could not join');
    } finally { setBusy(false); }
  }, [codeInput]);

  const startMatch = useCallback(async () => {
    if (!match || !me || match.host_id !== me.user_id) return;
    sound.uiTick();
    await supabase.from('game_matches')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', match.id);
  }, [match, me]);

  const leaveLobby = useCallback(async () => {
    if (match && me) {
      await supabase.from('game_match_players').delete().eq('match_id', match.id).eq('user_id', me.user_id);
    }
    setMatch(null); setPlayers([]); setMe(null); setMode('menu');
  }, [match, me]);

  if (mode === 'menu') {
    return (
      <div className="screen mp-lobby">
        <header className="brand-header">
          <div className="brand-mark">STAR<span>RUSH</span></div>
        </header>
        <p className="mp-tag">Race up to 5 players around one shared city. Most stars wins.</p>
        <div className="btn-row" style={{ flexDirection: 'column' }}>
          <button className="dk-btn dk-btn-gold" onClick={() => { sound.uiTick(); setMode('host'); }}>Host a Match</button>
          <button className="dk-btn dk-btn-outline" onClick={() => { sound.uiTick(); setMode('join'); }}>Join a Match</button>
          <button className="dk-btn dk-btn-ghost" onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    return (
      <div className="screen mp-lobby">
        <h2 className="mp-title">Host Match</h2>
        <label className="mp-label">Round length</label>
        <div className="difficulty-row">
          {[120, 180, 300].map((s) => (
            <button key={s} className={`diff-chip${duration === s ? ' active' : ''}`} onClick={() => setDuration(s as 120 | 180 | 300)}>
              {s / 60} min
            </button>
          ))}
        </div>
        {error && <p className="mp-error">{error}</p>}
        <div className="btn-row" style={{ flexDirection: 'column' }}>
          <button className="dk-btn dk-btn-gold" disabled={busy} onClick={hostCreate}>{busy ? 'Creating…' : 'Create Room'}</button>
          <button className="dk-btn dk-btn-ghost" onClick={() => setMode('menu')}>← Back</button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="screen mp-lobby">
        <h2 className="mp-title">Join Match</h2>
        <label className="mp-label">4-character code</label>
        <input
          className="mp-code-input"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="GK7X"
          maxLength={4}
          autoCapitalize="characters"
        />
        {error && <p className="mp-error">{error}</p>}
        <div className="btn-row" style={{ flexDirection: 'column' }}>
          <button className="dk-btn dk-btn-gold" disabled={busy || codeInput.length !== 4} onClick={joinByCode}>
            {busy ? 'Joining…' : 'Join'}
          </button>
          <button className="dk-btn dk-btn-ghost" onClick={() => setMode('menu')}>← Back</button>
        </div>
      </div>
    );
  }

  // waiting
  if (!match || !me) return null;
  const isHost = match.host_id === me.user_id;
  return (
    <div className="screen mp-lobby">
      <h2 className="mp-title">Lobby</h2>
      <div className="mp-code-display">{match.code}</div>
      <p className="mp-tag">Share the code · {match.duration_s / 60} min round</p>

      <ol className="mp-player-list">
        {players.map((p) => (
          <li key={p.user_id} className={p.user_id === me.user_id ? 'me' : ''}>
            <span className={`mp-color-chip mp-c-${p.color}`} />
            <span className="mp-player-name">
              {p.display_name || 'Driver'}{p.user_id === match.host_id ? ' · host' : ''}{p.user_id === me.user_id ? ' (you)' : ''}
            </span>
          </li>
        ))}
      </ol>

      <div className="btn-row" style={{ flexDirection: 'column' }}>
        {isHost ? (
          <button className="dk-btn dk-btn-gold" disabled={players.length < 1} onClick={startMatch}>Start Match</button>
        ) : (
          <p className="mp-tag">Waiting for the host to start…</p>
        )}
        <button className="dk-btn dk-btn-ghost" onClick={leaveLobby}>Leave</button>
      </div>
    </div>
  );
}
