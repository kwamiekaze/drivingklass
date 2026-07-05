import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { DrivingScene, GAME_W, GAME_H } from '../game/DrivingScene';
import { GAME_EVENTS, type Difficulty, type LevelResult } from '../game/types';
import { resetTouchControls } from '../game/controls';
import { TouchControls } from './TouchControls';

interface Props {
  levelId: string;
  difficulty: Difficulty;
  onComplete: (result: LevelResult) => void;
  onQuit: () => void;
}

export function GameCanvas({ levelId, difficulty, onComplete, onQuit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [showQuitPrompt, setShowQuitPrompt] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    resetTouchControls();

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: '#2e2e33',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [],
    });
    gameRef.current = game;
    game.scene.add('driving', DrivingScene, true, { levelId, difficulty });

    const handler = (result: LevelResult) => onCompleteRef.current(result);
    game.events.on(GAME_EVENTS.LEVEL_COMPLETE, handler);

    return () => {
      game.events.off(GAME_EVENTS.LEVEL_COMPLETE, handler);
      game.destroy(true);
      gameRef.current = null;
      resetTouchControls();
    };
  }, [levelId, difficulty]);

  const saveAndQuit = () => {
    const scene = gameRef.current?.scene.getScene('driving') as DrivingScene | undefined;
    if (scene?.endEarly) {
      setShowQuitPrompt(false);
      scene.endEarly();
    } else {
      onQuit();
    }
  };

  return (
    <div className="game-wrap">
      <div className="game-topbar">
        <button
          className="dk-btn dk-btn-ghost dk-btn-small"
          onClick={() => setShowQuitPrompt(true)}
        >
          ← Quit lesson
        </button>
        <span className="game-topbar-hint">↑ gas · ↓ brake · ←→ steer</span>
      </div>
      <div ref={hostRef} className="game-host" />
      <TouchControls />

      {showQuitPrompt && (
        <div className="dk-modal-backdrop" onClick={() => setShowQuitPrompt(false)}>
          <div className="dk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2 style={{ marginTop: 0 }}>Quit lesson?</h2>
            <p style={{ opacity: 0.85 }}>
              End the run now and save your score to the leaderboard, or discard and go back to the menu.
            </p>
            <div className="btn-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <button className="dk-btn dk-btn-ghost" onClick={() => setShowQuitPrompt(false)}>
                Keep Playing
              </button>
              <button className="dk-btn dk-btn-outline" onClick={onQuit}>
                Discard & Quit
              </button>
              <button className="dk-btn dk-btn-gold" onClick={saveAndQuit}>
                Save Score & Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
