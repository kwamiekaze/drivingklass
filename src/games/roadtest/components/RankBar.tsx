import { getXp, getRankForXp } from '../game/rank';

export function RankBar() {
  const xp = getXp();
  const { rank, next, pct } = getRankForXp(xp);
  return (
    <div className="rank-bar">
      <div className="rank-head">
        <span className="rank-icon">{rank.icon}</span>
        <div className="rank-info">
          <strong>{rank.label}</strong>
          <small>{xp.toLocaleString()} XP{next ? ` · next: ${next.label}` : ' · max rank'}</small>
        </div>
      </div>
      <div className="rank-track"><div className="rank-fill" style={{ width: `${pct * 100}%` }} /></div>
    </div>
  );
}
