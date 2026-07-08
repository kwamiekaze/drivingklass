import { getTodaysMissions } from '../game/missions';

export function MissionsPanel() {
  const { defs, progress, completed } = getTodaysMissions();
  return (
    <section className="missions-panel" aria-label="Daily missions">
      <div className="missions-head">📋 Today's Missions</div>
      <ul>
        {defs.map((m) => {
          const cur = Math.min(progress[m.id] ?? 0, m.goal);
          const done = completed.has(m.id);
          return (
            <li key={m.id} className={done ? 'mission-done' : ''}>
              <span className="mission-label">{done ? '✅' : '•'} {m.label}</span>
              <span className="mission-progress">{done ? `+${m.xp} XP` : `${cur}/${m.goal}`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
