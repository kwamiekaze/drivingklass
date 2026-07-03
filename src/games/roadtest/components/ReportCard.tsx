import { LEVELS } from '../game/levels';
import type { LevelResult } from '../game/types';

interface Props {
  result: LevelResult;
  onRetry: () => void;
  onNext: (nextLevelId: string) => void;
  onMenu: () => void;
}

export function ReportCard({ result, onRetry, onNext, onMenu }: Props) {
  const idx = LEVELS.findIndex((l) => l.id === result.levelId);
  const next = idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

  return (
    <div className="screen report-screen">
      <div className="report-card">
        <header className="report-head">
          <div>
            <div className="report-eyebrow">DrivingKlass · Instructor Report Card</div>
            <h2>{result.levelName}</h2>
          </div>
          <div
            className={`grade-stamp ${result.passed ? 'grade-pass' : 'grade-fail'}`}
            aria-label={`Grade ${result.grade}`}
          >
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
                <td>
                  {e.label}
                  {e.count > 1 ? ` ×${e.count}` : ''}
                </td>
                <td className="pts">
                  {e.points > 0 ? '+' : ''}
                  {e.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="report-feedback">
          <h3>Instructor notes</h3>
          <ul>
            {result.feedback.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="btn-row">
          <button className="dk-btn dk-btn-outline" onClick={onRetry}>
            Retry Lesson
          </button>
          {next && result.passed ? (
            <button className="dk-btn dk-btn-gold" onClick={() => onNext(next.id)}>
              Next: {next.name}
            </button>
          ) : (
            <button className="dk-btn dk-btn-gold" onClick={onMenu}>
              Back to Menu
            </button>
          )}
        </div>

        <a
          className="dk-btn dk-btn-black book-cta"
          href="https://drivingklass.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Book a Real Driving Lesson
        </a>
      </div>
    </div>
  );
}
