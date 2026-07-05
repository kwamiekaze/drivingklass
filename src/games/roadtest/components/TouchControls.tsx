import { useMemo } from 'react';
import { touchControls, type ControlState } from '../game/controls';
import { sound } from '../sound';

/**
 * On-screen buttons for phones/tablets. They write straight into the shared
 * touchControls object that the Phaser scene reads every frame.
 * Rendered only on coarse-pointer (touch) devices.
 */
export function TouchControls() {
  const isTouch = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches ||
        'ontouchstart' in window),
    []
  );
  if (!isTouch) return null;

  const bind = (key: keyof ControlState) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      touchControls[key] = true;
    },
    onPointerUp: () => (touchControls[key] = false),
    onPointerLeave: () => (touchControls[key] = false),
    onPointerCancel: () => (touchControls[key] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  });

  return (
    <div className="touch-controls" aria-hidden="true">
      <div className="touch-cluster">
        <button className="touch-btn" {...bind('left')}>
          ◀
        </button>
        <button className="touch-btn" {...bind('right')}>
          ▶
        </button>
      </div>
      <div className="touch-cluster">
        <button className="touch-btn touch-brake" {...bind('brake')}>
          BRAKE
        </button>
        <button className="touch-btn touch-gas" {...bind('gas')}>
          GAS
        </button>
      </div>
    </div>
  );
}
