import { POINTS } from '../game/scoring';

interface Props {
  onClose: () => void;
}

export function HowToPlay({ onClose }: Props) {
  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div
        className="dk-modal"
        role="dialog"
        aria-label="How to play"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>How to Play</h2>

        <h3>Controls</h3>
        <ul className="howto-list">
          <li>
            <b>Desktop:</b> Arrow keys or WASD — ↑ gas, ↓ brake, ←→ steer
          </li>
          <li>
            <b>Mobile:</b> On-screen GAS / BRAKE and steering buttons
          </li>
        </ul>

        <h3>Earn points</h3>
        <ul className="howto-list">
          <li>Reach checkpoints (+{POINTS.CHECKPOINT})</li>
          <li>Come to a full stop at stop signs (+{POINTS.FULL_STOP})</li>
          <li>Pass lights on green (+{POINTS.GREEN_LIGHT})</li>
          <li>Drive smoothly in your lane (+{POINTS.SMOOTH_DRIVING})</li>
          <li>Finish the course (+{POINTS.FINISH_BONUS})</li>
        </ul>

        <h3>Lose points</h3>
        <ul className="howto-list faults">
          <li>Hit a cone ({POINTS.HIT_CONE})</li>
          <li>Unsafe lane change — cutting off a car ({POINTS.LANE_CROSS})</li>
          <li>Speed over the limit ({POINTS.SPEEDING})</li>
          <li>Run a stop sign ({POINTS.RAN_STOP_SIGN})</li>
          <li>Run a red light ({POINTS.RAN_RED_LIGHT})</li>
          <li>Collide with cars ({POINTS.HIT_TRAFFIC})</li>
        </ul>

        <p className="howto-tip">
          Instructor tip: to “full stop,” slow to 0 mph just before the white
          line — exactly like the real road test.
        </p>

        <button className="dk-btn dk-btn-gold" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
