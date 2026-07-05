import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LEVELS } from './game/levels';

interface Props { onClose: () => void; }

interface Row {
  level_id: string;
  plays: number;
  best_score: number;
  best_grade: string;
}

export function MyStatsModal({ onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const [{ data: plays }, { data: scores }, { data: profile }] = await Promise.all([
        supabase.from('game_plays').select('level_id, score, stars').eq('user_id', u.user.id),
        supabase.from('game_scores').select('level_id, score, grade').eq('user_id', u.user.id),
        supabase.from('profiles').select('current_streak, best_streak').eq('id', u.user.id).maybeSingle(),
      ]);
      const byLevel = new Map<string, Row>();
      (plays || []).forEach((p: any) => {
        const r = byLevel.get(p.level_id) || { level_id: p.level_id, plays: 0, best_score: 0, best_grade: '-' };
        r.plays += 1;
        byLevel.set(p.level_id, r);
      });
      (scores || []).forEach((s: any) => {
        const r = byLevel.get(s.level_id) || { level_id: s.level_id, plays: 0, best_score: 0, best_grade: '-' };
        if (s.score > r.best_score) { r.best_score = s.score; r.best_grade = s.grade; }
        byLevel.set(s.level_id, r);
      });
      setRows(Array.from(byLevel.values()));
      setTotalRuns((plays || []).length);
      setTotalStars((plays || []).reduce((sum: number, p: any) => sum + (p.stars || 0), 0));
      setCurrentStreak(profile?.current_streak ?? 0);
      setBestStreak(profile?.best_streak ?? 0);
      setLoading(false);
    })();
  }, []);

  const nameFor = (id: string) => LEVELS.find((l) => l.id === id)?.name || id;

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '86vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0, color: '#f2c14e' }}>My Stats</h2>
        {loading ? <p>Loading…</p> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
              <div className="stat-chip"><small>Total runs</small><strong>{totalRuns}</strong></div>
              <div className="stat-chip"><small>Total stars</small><strong>{totalStars}</strong></div>
              <div className="stat-chip"><small>🔥 Current streak</small><strong>{currentStreak}</strong></div>
              <div className="stat-chip"><small>Best streak</small><strong>{bestStreak}</strong></div>
            </div>
            <table className="report-table">
              <thead><tr><th style={{ textAlign: 'left' }}>Level</th><th>Plays</th><th>Best</th><th>Grade</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={4} style={{ opacity: 0.7, textAlign: 'center', padding: 12 }}>No runs yet. Play a lesson to see your stats.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.level_id}>
                    <td>{nameFor(r.level_id)}</td>
                    <td className="pts">{r.plays}</td>
                    <td className="pts">{r.best_score || '—'}</td>
                    <td className="pts">{r.best_grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="dk-btn dk-btn-gold" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
