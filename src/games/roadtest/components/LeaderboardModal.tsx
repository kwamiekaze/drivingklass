import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LEVELS } from '../game/levels';
import { DIFFICULTIES, type Difficulty } from '../game/types';

interface Row {
  user_id: string;
  display_name: string | null;
  level_id: string;
  score: number;
  grade: string;
  difficulty: Difficulty;
}

interface Props {
  onClose: () => void;
}

type TabId = string;

export function LeaderboardModal({ onClose }: Props) {
  const [tab, setTab] = useState<TabId>('overall');
  const [diffFilter, setDiffFilter] = useState<'all' | Difficulty>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      if (!cancelled) setMe(userRes.user?.id ?? null);
      const { data } = await supabase
        .from('game_scores')
        .select('user_id, display_name, level_id, score, grade, difficulty')
        .order('score', { ascending: false });
      if (!cancelled) {
        setRows(((data as any[]) ?? []) as Row[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => diffFilter === 'all' || r.difficulty === diffFilter),
    [rows, diffFilter]
  );

  const view = useMemo(() => {
    if (tab === 'overall') {
      const totals = new Map<string, { user_id: string; display_name: string | null; score: number; grade: string; difficulty: string }>();
      for (const r of filtered) {
        const cur = totals.get(r.user_id);
        if (!cur) totals.set(r.user_id, { user_id: r.user_id, display_name: r.display_name, score: r.score, grade: r.grade, difficulty: '' });
        else {
          cur.score += r.score;
          if (!cur.display_name && r.display_name) cur.display_name = r.display_name;
        }
      }
      return [...totals.values()].sort((a, b) => b.score - a.score).slice(0, 10)
        .map((r) => ({ ...r, grade: '' }));
    }
    return filtered
      .filter((r) => r.level_id === tab)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({ user_id: r.user_id, display_name: r.display_name, score: r.score, grade: r.grade, difficulty: r.difficulty }));
  }, [filtered, tab]);

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal dk-leaderboard" onClick={(e) => e.stopPropagation()}>
        <div className="dk-lb-head">
          <h2>Leaderboard</h2>
          <button className="dk-btn dk-btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="dk-lb-tabs" role="tablist">
          <button className={`dk-lb-tab${diffFilter === 'all' ? ' active' : ''}`} onClick={() => setDiffFilter('all')}>All</button>
          {DIFFICULTIES.map((d) => (
            <button key={d.id} className={`dk-lb-tab${diffFilter === d.id ? ' active' : ''}`} onClick={() => setDiffFilter(d.id)}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="dk-lb-tabs" role="tablist">
          <button className={`dk-lb-tab${tab === 'overall' ? ' active' : ''}`} onClick={() => setTab('overall')}>Overall</button>
          {LEVELS.map((l, i) => (
            <button key={l.id} className={`dk-lb-tab${tab === l.id ? ' active' : ''}`} onClick={() => setTab(l.id)} title={l.name}>
              {l.endless ? '∞' : `L${i}`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="dk-lb-empty">Loading…</p>
        ) : view.length === 0 ? (
          <p className="dk-lb-empty">No scores yet. Be the first — finish a run to post!</p>
        ) : (
          <ol className="dk-lb-list">
            {view.map((r, i) => {
              const mine = r.user_id === me;
              return (
                <li key={r.user_id} className={mine ? 'mine' : ''}>
                  <span className="rank">#{i + 1}</span>
                  <span className="name">
                    {r.display_name || 'Driver'}{mine ? ' (you)' : ''}
                  </span>
                  <span className="score">{r.score.toLocaleString()}</span>
                  {r.grade ? <span className="grade">{r.grade}</span> : null}
                  {r.difficulty ? <span className="grade">{r.difficulty}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
