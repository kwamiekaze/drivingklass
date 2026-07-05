import { useCallback, useEffect, useRef, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { HowToPlay } from './components/HowToPlay';
import { GameCanvas } from './components/GameCanvas';
import { ReportCard } from './components/ReportCard';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MultiplayerRoot } from './multiplayer/MultiplayerRoot';
import { GuestScoreModal } from './GuestScoreModal';
import { submitScore } from './submitScore';
import { sound } from './sound';
import type { Difficulty, LevelResult } from './game/types';
import './roadtest.css';

type Screen = 'menu' | 'playing' | 'report' | 'multiplayer';
const DIFF_KEY = 'dk-game-difficulty';

/** Selectors that should keep native touch behavior (scrolling, typing). */
const SCROLLABLE_SELECTOR =
  '.level-list, .mp-open-list, .dk-lb-list, .dk-modal, .dk-modal-backdrop, input, textarea, select, [contenteditable="true"]';

export default function RoadTestGame() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [levelId, setLevelId] = useState('parking-lot');
  const [difficulty, setDifficultyState] = useState<Difficulty>('learner');
  const [result, setResult] = useState<LevelResult | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const [guestPromptResult, setGuestPromptResult] = useState<LevelResult | null>(null);

  useEffect(() => {
    try {
      const d = localStorage.getItem(DIFF_KEY) as Difficulty | null;
      if (d) setDifficultyState(d);
    } catch { /* ignore */ }
  }, []);

  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    try { localStorage.setItem(DIFF_KEY, d); } catch { /* ignore */ }
  }, []);

  const start = useCallback((id: string) => {
    setLevelId(id);
    setScreen('playing');
  }, []);

  const handleComplete = useCallback((r: LevelResult) => {
    setBestScores((prev) => ({ ...prev, [r.levelId]: Math.max(prev[r.levelId] ?? 0, r.score) }));
    submitScore(r)
      .then(({ isNewBest, previousBest, isGuest }) => {
        setResult({ ...r, isNewBest, previousBest: previousBest ?? undefined });
        if (isGuest) setGuestPromptResult(r);
      })
      .catch((err) => {
        console.error(err);
        setResult(r);
      });
    setScreen('report');
  }, []);

  return (
    <div className="dk-game">
      <div className="app-shell">
        {screen === 'menu' && (
          <StartScreen
            bestScores={bestScores}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onStart={start}
            onHowToPlay={() => setShowHowTo(true)}
            onLeaderboard={() => setShowLeaderboard(true)}
            onMultiplayer={() => setScreen('multiplayer')}
          />
        )}

        {screen === 'multiplayer' && (
          <MultiplayerRoot onExit={() => setScreen('menu')} />
        )}

        {screen === 'playing' && (
          <GameCanvas
            levelId={levelId}
            difficulty={difficulty}
            onComplete={handleComplete}
            onQuit={() => setScreen('menu')}
          />
        )}

        {screen === 'report' && result && (
          <ReportCard
            result={result}
            onRetry={() => start(result.levelId)}
            onNext={(nextId) => start(nextId)}
            onMenu={() => setScreen('menu')}
          />
        )}

        {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
        {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
        {guestPromptResult && (
          <GuestScoreModal
            result={guestPromptResult}
            onDone={() => setGuestPromptResult(null)}
            onSkip={() => setGuestPromptResult(null)}
          />
        )}
      </div>
    </div>
  );
}
