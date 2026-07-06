import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { supabase } from '@/integrations/supabase/client';
import { TouchControls } from '../components/TouchControls';
import { resetTouchControls } from '../game/controls';
import { MultiplayerScene, MP_VIEW_W, MP_VIEW_H } from './MultiplayerScene';
import { MatchNet } from './net';
import { sound } from '../sound';
import { CAR_COLORS, type CarColor, type MatchRow, type PlayerRow, type RemotePlayer } from './types';

interface Props {
  match: MatchRow;
  players: PlayerRow[];
  me: PlayerRow;
  onFinish: (finalStars: { uid: string; displayName: string; color: CarColor; stars: number }[]) => void;
}

export function MultiplayerGame({ match, players, me, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const netRef = useRef<MatchNet | null>(null);
  const sceneRef = useRef<MultiplayerScene | null>(null);
  const [ownStars, setOwnStars] = useState(0);
  const [remotes, setRemotes] = useState<RemotePlayer[]>([]);
  const [remaining, setRemaining] = useState(match.duration_s);
  const [finished, setFinished] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [eliminatedUids, setEliminatedUids] = useState<Set<string>>(() => new Set());
  const lastTickSecRef = useRef<number>(match.duration_s);

  // Multiplayer: never pause the world (other players keep driving). Show a dim
  // "reconnecting view" if the tab has been hidden for >2s so the player knows why.
  useEffect(() => {
    let timer: number | null = null;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        timer = window.setTimeout(() => setReconnecting(true), 2000);
      } else {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        setReconnecting(false);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  // Start timestamp: give all clients a 3s buffer to countdown together
  const startAt = useMemo(() => Date.now() + 3000, []);

  useEffect(() => {
    if (!hostRef.current) return;
    resetTouchControls();

    const net = new MatchNet(match.id, me.user_id);
    netRef.current = net;

    // Deduplicate players: server list may have stale duplicates during rejoin
    const uniquePlayers = players.filter(
      (p, i, arr) => arr.findIndex((x) => x.user_id === p.user_id) === i
    );

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: MP_VIEW_W,
      height: MP_VIEW_H,
      backgroundColor: '#101014',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [],
    });
    gameRef.current = game;

    const sceneConfig = {
      net, uid: me.user_id, displayName: me.display_name ?? 'Driver',
      color: (me.color as CarColor) ?? CAR_COLORS[0],
      seed: match.seed,
      players: uniquePlayers.map((p) => ({
        uid: p.user_id,
        displayName: p.display_name ?? 'Driver',
        color: (p.color as CarColor) ?? 'gold',
      })),
      durationS: match.duration_s,
      startAt,
    };
    game.scene.add('multiplayer', MultiplayerScene, true, sceneConfig);

    // Grab scene ref shortly after boot
    const grabScene = () => {
      const s = game.scene.getScene('multiplayer') as MultiplayerScene | null;
      if (s) sceneRef.current = s;
    };
    setTimeout(grabScene, 100);

    net.connect({
      onMessage: (msg) => {
        if (msg.t === 'end') {
          setFinished(true);
        } else if (msg.t === 'elim') {
          setEliminatedUids((prev) => {
            const n = new Set(prev); n.add(msg.uid); return n;
          });
          sceneRef.current?.applyNetMessage(msg);
        } else {
          sceneRef.current?.applyNetMessage(msg);
        }
      },
    });

    game.events.on('mp-hud', (data: { stars: number; remotes: RemotePlayer[] }) => {
      setOwnStars(data.stars);
      setRemotes(data.remotes);
    });
    game.events.on('mp-elim', (data: { uid: string }) => {
      if (data.uid === me.user_id) setEliminated(true);
      setEliminatedUids((prev) => {
        const n = new Set(prev); n.add(data.uid); return n;
      });
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      net.disconnect();
      netRef.current = null;
      sceneRef.current = null;
      resetTouchControls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer (starts after 3s intro)
  useEffect(() => {
    const iv = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
      const left = Math.max(0, match.duration_s - elapsed);
      setRemaining(left);
      // Final-30s ticking chime once per second
      if (left > 0 && left <= 30 && left !== lastTickSecRef.current) {
        lastTickSecRef.current = left;
        sound.uiTick();
      }
      if (left <= 0) {
        clearInterval(iv);
        setFinished(true);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [match.duration_s, startAt]);

  const scoreboard = useMemo(() => {
    const rows = [
      { uid: me.user_id, displayName: me.display_name ?? 'You', color: me.color as CarColor, stars: ownStars, mine: true, stale: false, elim: eliminatedUids.has(me.user_id) || eliminated },
      ...remotes.map((r) => ({
        uid: r.uid, displayName: r.displayName, color: r.color, stars: r.stars, mine: false,
        stale: Date.now() - r.lastAt > 5000, elim: eliminatedUids.has(r.uid),
      })),
    ].sort((a, b) => b.stars - a.stars);
    return rows;
  }, [ownStars, remotes, me, eliminated, eliminatedUids]);

  const finalPush = remaining > 0 && remaining <= 30;


  // On finish: persist own score and broadcast end, then collect and report standings
  useEffect(() => {
    if (!finished) return;
    let cancelled = false;
    (async () => {
      const myFinal = sceneRef.current?.getFinalStars() ?? ownStars;
      // Broadcast end (each client fires; harmless duplicates)
      netRef.current?.send({ t: 'end' });
      // Persist my final stars
      try {
        await supabase.from('game_match_players')
          .update({ stars: myFinal })
          .eq('match_id', match.id)
          .eq('user_id', me.user_id);
        if (match.host_id === me.user_id) {
          await supabase.from('game_matches').update({ status: 'finished' }).eq('id', match.id);
        }
      } catch { /* ignore */ }

      // Small delay so peers also persist, then fetch standings
      await new Promise((r) => setTimeout(r, 1500));
      const { data } = await supabase.from('game_match_players')
        .select('*').eq('match_id', match.id);
      if (cancelled) return;
      const rows = (data as PlayerRow[]) ?? [];
      const standings = rows.map((r) => ({
        uid: r.user_id,
        displayName: r.display_name ?? 'Driver',
        color: (r.color as CarColor) ?? 'gold',
        stars: r.stars ?? 0,
      })).sort((a, b) => b.stars - a.stars);
      onFinish(standings);
    })();
    return () => { cancelled = true; };
  }, [finished, match.id, match.host_id, me.user_id, ownStars, onFinish]);


  const mm = String(Math.floor(remaining / 60)).padStart(1, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="mp-wrap">
      <div className="mp-hud-top">
        <div className={`mp-timer${finalPush ? ' final-push' : ''}`}>{mm}:{ss}</div>
        <div className="mp-own-stars">★ {ownStars}</div>
      </div>
      <ul className="mp-scoreboard">
        {scoreboard.map((r) => (
          <li key={r.uid} className={[r.mine ? 'mine' : '', r.stale ? 'stale' : '', r.elim ? 'elim' : ''].join(' ').trim()}>
            <span className={`mp-color-chip mp-c-${r.color}`} />
            <span className="mp-sb-name">{r.displayName}{r.mine ? ' (you)' : ''}{r.elim ? ' · OUT' : ''}</span>
            <span className="mp-sb-stars">★ {r.stars}</span>
          </li>
        ))}
      </ul>
      <div ref={hostRef} className="game-host mp-host" />
      {reconnecting && <div className="mp-reconnect-dim">RECONNECTING VIEW…</div>}
      {eliminated && (
        <div className="mp-elim-banner">
          <strong>ELIMINATED</strong>
          <span>You hit a pedestrian. Spectating until the timer runs out.</span>
        </div>
      )}
      <TouchControls />
    </div>
  );
}

