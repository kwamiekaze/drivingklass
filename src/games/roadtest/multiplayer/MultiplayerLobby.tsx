import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type MatchRow, type PlayerRow } from './types';
import { sound } from '../sound';

interface Props {
  onEnterMatch: (match: MatchRow, players: PlayerRow[], me: PlayerRow) => void;
  onBack: () => void;
}

interface PublicMatch {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  status: string;
  duration_s: number;
  player_count: number;
  seats_left: number;
  created_at: string;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (r === 0) return `${m} min`;
  return `${m}m ${r}s`;
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
  const [duration, setDuration] = useState<number>(180);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [me, setMe] = useState<PlayerRow | null>(null);

  const [publicMatches, setPublicMatches] = useState<PublicMatch[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Poll public matches when on join screen
  useEffect(() => {
    if (mode !== 'join') return;
    let cancelled = false;
    const load = async () => {
      setLoadingList(true);
      const { data, error: rpcErr } = await supabase.rpc('list_public_matches');
      if (!cancelled) {
        if (!rpcErr && data) setPublicMatches(data as PublicMatch[]);
        setLoadingList(false);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [mode]);

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
      const { data: m, error: mErr } = await supabase.rpc('create_match', { _duration_s: duration });
      if (mErr || !m) throw mErr ?? new Error('Failed to create match');

      const { data: rows, error: pErr } = await supabase
        .from('game_match_players')
        .select('*')
        .eq('match_id', m.id)
        .order('joined_at');
      if (pErr) throw pErr;
      const playerRows = (rows as PlayerRow[]) ?? [];
      const p = playerRows.find((row) => row.user_id === meUser.id);
      if (!p) throw new Error('Failed to join');

      setMatch(m as MatchRow);
      setPlayers(playerRows);
      setMe(p);
      setMode('waiting');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create match');
    } finally { setBusy(false); }
  }, [duration]);

  const joinByCode = useCallback(async (rawCode?: string) => {
    setBusy(true); setError(null);
    try {
      const meUser = await getMe();
      const code = (rawCode ?? codeInput).trim().toUpperCase();
      if (code.length !== 4) throw new Error('Enter a 4-character code');

      // Atomic join via RPC (locks the match, validates capacity, assigns color)
      const { data: matchId, error: joinErr } = await supabase.rpc('join_open_match', { _code: code });
      if (joinErr) throw joinErr;
      if (!matchId) throw new Error('Match not found');

      const [{ data: m }, { data: list }] = await Promise.all([
        supabase.from('game_matches').select('*').eq('id', matchId).maybeSingle(),
        supabase.from('game_match_players').select('*').eq('match_id', matchId).order('joined_at'),
      ]);
      if (!m) throw new Error('Match not found');
      const rows = (list as PlayerRow[]) ?? [];
      const mine = rows.find((p) => p.user_id === meUser.id);
      if (!mine) throw new Error('Failed to join');

      setMatch(m as MatchRow);
      setPlayers(rows);
      setMe(mine);
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
        <label className="mp-label">Round length · {formatDuration(duration)}</label>
        <div className="mp-slider-row">
          <input
            type="range"
            min={60}
            max={600}
            step={30}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="mp-slider"
            aria-label="Round length in seconds"
          />
          <div className="mp-slider-ticks">
            <span>1m</span><span>5m</span><span>10m</span>
          </div>
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
        <div className="btn-row" style={{ flexDirection: 'column' }}>
          <button className="dk-btn dk-btn-gold" disabled={busy || codeInput.length !== 4} onClick={() => joinByCode()}>
            {busy ? 'Joining…' : 'Join with Code'}
          </button>
        </div>

        <div className="mp-open-header">
          <span className="mp-label">Open matches</span>
          {loadingList && <span className="mp-tag" style={{ fontSize: 11 }}>refreshing…</span>}
        </div>
        <ul className="mp-open-list">
          {publicMatches.length === 0 && !loadingList && (
            <li className="mp-open-empty">No open lobbies right now.</li>
          )}
          {publicMatches.map((pm) => (
            <li key={pm.id} className="mp-open-row">
              <div className="mp-open-info">
                <strong>{pm.code}</strong>
                <span className="mp-open-host">{pm.host_name}</span>
                <span className="mp-open-meta">{formatDuration(pm.duration_s)} · {pm.player_count}/5</span>
              </div>
              <button
                className="dk-btn dk-btn-outline dk-btn-sm"
                disabled={busy || pm.seats_left <= 0}
                onClick={() => joinByCode(pm.code)}
              >
                {pm.seats_left <= 0 ? 'Full' : 'Join'}
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="mp-error">{error}</p>}
        <div className="btn-row" style={{ flexDirection: 'column' }}>
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
      <p className="mp-tag">Share the code · {formatDuration(match.duration_s)} round</p>

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
