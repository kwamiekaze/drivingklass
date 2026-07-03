import { useCallback, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { HowToPlay } from './components/HowToPlay';
import { GameCanvas } from './components/GameCanvas';
import { ReportCard } from './components/ReportCard';
import type { LevelResult } from './game/types';
import './roadtest.css';

type Screen = 'menu' | 'playing' | 'report';

export default function RoadTestGame() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [levelId, setLevelId] = useState('parking-lot');
  const [result, setResult] = useState<LevelResult | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  const start = useCallback((id: string) => {
    setLevelId(id);
    setScreen('playing');
  }, []);

  const handleComplete = useCallback((r: LevelResult) => {
    setResult(r);
    setBestScores((prev) => ({
      ...prev,
      [r.levelId]: Math.max(prev[r.levelId] ?? 0, r.score)
    }));
    setScreen('report');
  }, []);

  return (
    <div className="dk-game">
      <div className="app-shell">
      {screen === 'menu' && (
        <StartScreen
          bestScores={bestScores}
          onStart={start}
          onHowToPlay={() => setShowHowTo(true)}
        />
      )}

      {screen === 'playing' && (
        <GameCanvas
          levelId={levelId}
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
      </div>
    </div>
  );
}
