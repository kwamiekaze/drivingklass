import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, getAchievementState } from '../game/achievements';

interface Props { onClose: () => void }

export function BadgeCabinet({ onClose }: Props) {
  const [state, setState] = useState(() => getAchievementState());
  useEffect(() => { setState(getAchievementState()); }, []);
  const unlockedCount = ACHIEVEMENTS.filter((a) => state[a.id]?.unlocked).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card badge-cabinet" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>🏅 Badge Cabinet</h2>
          <button className="dk-btn dk-btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <p className="badge-count">{unlockedCount} / {ACHIEVEMENTS.length} unlocked</p>
        <div className="badge-grid">
          {ACHIEVEMENTS.map((a) => {
            const s = state[a.id];
            const done = !!s?.unlocked;
            const progress = Math.min(1, (s?.count ?? 0) / a.goal);
            return (
              <div key={a.id} className={`badge-item${done ? ' unlocked' : ' locked'}`}>
                <div className="badge-icon">{done ? a.icon : '🔒'}</div>
                <div className="badge-body">
                  <strong>{a.label}</strong>
                  <small>{a.hint}</small>
                  {!done && (
                    <div className="badge-bar"><div style={{ width: `${progress * 100}%` }} /></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
