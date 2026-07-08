import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardRow } from '../submitLeaderboard';
import { getPlayerName } from '../playerName';
import { todayKey } from '../game/dailyChallenge';

interface Props { onClose: () => void }

type Tab = 'daily' | 'endlessWeek' | 'endlessAll';

export function PublicLeaderboardModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('daily');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const me = getPlayerName();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let data: LeaderboardRow[] = [];
      if (tab === 'daily') data = await fetchLeaderboard('daily', { day: todayKey(), limit: 50 });
      else if (tab === 'endlessAll') data = await fetchLeaderboard('endless', { limit: 50 });
      else {
        const since = new Date(); since.setDate(since.getDate() - 7);
        data = await fetchLeaderboard('endless', { sinceIso: since.toISOString(), limit: 50 });
      }
      if (!cancelled) { setRows(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card public-lb" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>🏆 Global Leaderboards</h2>
          <button className="dk-btn dk-btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="lb-tabs">
          <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Daily</button>
          <button className={tab === 'endlessWeek' ? 'active' : ''} onClick={() => setTab('endlessWeek')}>Endless · Week</button>
          <button className={tab === 'endlessAll' ? 'active' : ''} onClick={() => setTab('endlessAll')}>Endless · All-Time</button>
        </div>
        {loading ? (
          <p className="lb-empty">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="lb-empty">No scores yet — be the first!</p>
        ) : (
          <ol className="lb-list">
            {rows.map((r, i) => (
              <li key={r.id} className={`lb-row rank-${i}${me && r.player_name === me ? ' me' : ''}`}>
                <span className="lb-rank">{medal(i)}</span>
                <span className="lb-name">{r.player_name}</span>
                <span className="lb-score">{r.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
