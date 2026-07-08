import { useEffect, useState } from 'react';
import { getDailyChallenge, formatCountdown, msUntilMidnight, getDailyState } from '../game/dailyChallenge';

interface Props { onStart: (levelId: string) => void }

export function DailyChallengeCard({ onStart }: Props) {
  const ch = getDailyChallenge();
  const [countdown, setCountdown] = useState(msUntilMidnight());
  const [state] = useState(() => getDailyState());
  useEffect(() => {
    const t = setInterval(() => setCountdown(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const streak = state.lastDay === ch.day ? state.streak : (state.lastDay ? state.streak : 0);

  return (
    <button className="daily-challenge-card" onClick={() => onStart(ch.levelId)}>
      <div className="dc-top">
        <span className="dc-badge">DAILY CHALLENGE</span>
        <span className="dc-countdown">⏱ resets in {formatCountdown(countdown)}</span>
      </div>
      <strong className="dc-title">{ch.levelName}</strong>
      <div className="dc-meta">
        <span>{ch.difficultyLabel}</span>
        <span>Par {ch.parScore.toLocaleString()}</span>
        {streak > 0 && <span className="dc-streak">🔥 {streak}-day</span>}
      </div>
      <small className="dc-flavor">{ch.flavor}</small>
    </button>
  );
}
