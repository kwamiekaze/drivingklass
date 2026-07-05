import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CarColor, MatchRow } from './types';

interface Standing {
  uid: string;
  displayName: string;
  color: CarColor;
  stars: number;
}

interface Props {
  match: MatchRow;
  meUid: string;
  standings: Standing[];
  onRematch: () => void;
  onMenu: () => void;
}

export function Podium({ match, meUid, standings, onRematch, onMenu }: Props) {
  const confettiRef = useRef<HTMLDivElement>(null);
  const isHost = match.host_id === meUid;
  const winner = standings[0];

  useEffect(() => {
    if (!confettiRef.current) return;
    const el = confettiRef.current;
    for (let i = 0; i < 60; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.left = Math.random() * 100 + '%';
      bit.style.animationDelay = (Math.random() * 0.6) + 's';
      bit.style.background = i % 3 === 0 ? '#ffe89a' : i % 3 === 1 ? '#f2c14e' : '#c9971f';
      el.appendChild(bit);
    }
    return () => { el.innerHTML = ''; };
  }, []);

  const rematch = async () => {
    if (!isHost) return;
    const seed = Math.floor(Math.random() * 2_000_000_000);
    // Reset all player scores
    await supabase.from('game_match_players').update({ stars: 0 }).eq('match_id', match.id);
    await supabase.from('game_matches')
      .update({ status: 'playing', seed, started_at: new Date().toISOString() })
      .eq('id', match.id);
    onRematch();
  };

  const medal = ['🥇', '🥈', '🥉'];
  const podiumClasses = ['pod-1', 'pod-2', 'pod-3'];

  return (
    <div className="screen mp-podium">
      <div className="confetti-layer" ref={confettiRef} aria-hidden="true" />
      <div className="pb-banner">🏆 {winner?.displayName ?? 'Winner'} WINS</div>

      <div className="mp-podium-row">
        {standings.slice(0, 3).map((s, i) => (
          <div key={s.uid} className={`mp-podium-card ${podiumClasses[i]}`}>
            <div className="mp-medal">{medal[i]}</div>
            <span className={`mp-color-chip mp-c-${s.color}`} />
            <strong>{s.displayName}</strong>
            <div className="mp-podium-score">★ {s.stars}</div>
          </div>
        ))}
      </div>

      <h3 className="mp-standings-title">Full Standings</h3>
      <ol className="mp-player-list">
        {standings.map((s, i) => (
          <li key={s.uid} className={s.uid === meUid ? 'me' : ''}>
            <span className="mp-podium-rank">#{i + 1}</span>
            <span className={`mp-color-chip mp-c-${s.color}`} />
            <span className="mp-player-name">{s.displayName}{s.uid === meUid ? ' (you)' : ''}</span>
            <span className="mp-sb-stars">★ {s.stars}</span>
          </li>
        ))}
      </ol>

      <div className="btn-row" style={{ flexDirection: 'column' }}>
        {isHost && <button className="dk-btn dk-btn-gold" onClick={rematch}>Rematch</button>}
        <button className="dk-btn dk-btn-outline" onClick={onMenu}>Back to Menu</button>
      </div>
    </div>
  );
}
