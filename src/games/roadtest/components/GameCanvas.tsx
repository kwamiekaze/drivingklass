import { useEffect, useRef } from 'react';
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

  return (
    <div className="game-wrap">
      <div className="game-topbar">
        <button className="dk-btn dk-btn-ghost dk-btn-small" onClick={onQuit}>← Quit lesson</button>
        <span className="game-topbar-hint">↑ gas · ↓ brake · ←→ steer</span>
      </div>
      <div ref={hostRef} className="game-host" />
      <TouchControls />
    </div>
  );
}
