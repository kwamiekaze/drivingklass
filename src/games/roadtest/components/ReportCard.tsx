import { useEffect, useRef } from 'react';
import { LEVELS } from '../game/levels';
import { DIFFICULTIES } from '../game/types';
import type { LevelResult } from '../game/types';
import type { RunAftermath } from '../runComplete';
import { ShareScoreButton } from './ShareScoreButton';
import { sound } from '../sound';

interface Props {
  result: LevelResult;
  aftermath?: RunAftermath | null;
  onRetry: () => void;
  onNext: (nextLevelId: string) => void;
  onMenu: () => void;
}

export function ReportCard({ result, onRetry, onNext, onMenu }: Props) {
  const idx = LEVELS.findIndex((l) => l.id === result.levelId);
  const next = idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  const diff = DIFFICULTIES.find((d) => d.id === result.difficulty);
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result.isNewBest || !confettiRef.current) return;
    const el = confettiRef.current;
    for (let i = 0; i < 40; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.left = Math.random() * 100 + '%';
      bit.style.animationDelay = (Math.random() * 0.4) + 's';
      bit.style.background = i % 3 === 0 ? '#ffe89a' : '#f2c14e';
      el.appendChild(bit);
    }
    return () => { el.innerHTML = ''; };
  }, [result.isNewBest]);

  return (
    <div className="screen report-screen">
      {result.isNewBest && (
        <>
          <div className="confetti-layer" ref={confettiRef} aria-hidden="true" />
          <div className="pb-banner">🏆 NEW PERSONAL BEST</div>
        </>
      )}

      <div className="report-card">
        <header className="report-head">
          <div>
            <div className="report-eyebrow">DrivingKlass · Instructor Report Card</div>
            <h2>{result.levelName}</h2>
            {diff && <div className="report-eyebrow" style={{ marginTop: 4 }}>{diff.label} · ×{diff.scoreMul} multiplier</div>}
          </div>
          <div className={`grade-stamp ${result.passed ? 'grade-pass' : 'grade-fail'}`} aria-label={`Grade ${result.grade}`}>
            {result.grade}
          </div>
        </header>

        <div className="report-score">
          <span>Final score</span>
          <strong>{result.score}</strong>
        </div>

        <table className="report-table">
          <tbody>
            {result.events.map((e) => (
              <tr key={e.label} className={e.points < 0 ? 'row-fault' : ''}>
                <td>{e.label}{e.count > 1 ? ` ×${e.count}` : ''}</td>
                <td className="pts">{e.points > 0 ? '+' : ''}{e.points}</td>
              </tr>
            ))}
            {diff && diff.scoreMul > 1 && (
              <tr>
                <td>{diff.label} difficulty multiplier</td>
                <td className="pts">×{diff.scoreMul}</td>
              </tr>
            )}
            {result.distance !== undefined && (
              <tr>
                <td>Distance driven</td>
                <td className="pts">{result.distance}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="report-feedback">
          <h3>Instructor notes</h3>
          <ul>
            {result.feedback.map((f) => <li key={f}>{f}</li>)}
            {result.isNewBest && result.previousBest != null && (
              <li><strong>New personal best!</strong> Previous: {result.previousBest.toLocaleString()}</li>
            )}
          </ul>
        </div>

        <div className="btn-row">
          <button className="dk-btn dk-btn-outline" onClick={onRetry}>Retry Lesson</button>
          {next && result.passed && !next.endless ? (
            <button className="dk-btn dk-btn-gold" onClick={() => onNext(next.id)}>Next: {next.name}</button>
          ) : (
            <button className="dk-btn dk-btn-gold" onClick={onMenu}>Back to Menu</button>
          )}
        </div>

        <a className="dk-btn dk-btn-black book-cta" href="https://drivingklass.com" target="_blank" rel="noopener noreferrer">
          Book a Real Driving Lesson
        </a>
      </div>
    </div>
  );
}
