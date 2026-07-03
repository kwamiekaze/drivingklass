import type { LevelConfig, LevelResult, ScoreEvent } from './types';

/** Central table of every scoring rule in the game. */
export const POINTS = {
  CHECKPOINT: 100,
  FULL_STOP: 75,
  GREEN_LIGHT: 25,
  SMOOTH_DRIVING: 25, // awarded every few seconds of clean lane-keeping
  FINISH_BONUS: 200,

  HIT_CONE: -50,
  LANE_CROSS: -30,
  SPEEDING: -40,
  RAN_STOP_SIGN: -100,
  RAN_RED_LIGHT: -120,
  HIT_PARKED_CAR: -100,
  HIT_TRAFFIC: -150
} as const;

const LABELS: Record<string, string> = {
  CHECKPOINT: 'Checkpoint reached',
  FULL_STOP: 'Full stop at stop sign',
  GREEN_LIGHT: 'Passed on green',
  SMOOTH_DRIVING: 'Smooth lane-keeping',
  FINISH_BONUS: 'Completed the course',
  HIT_CONE: 'Hit a cone',
  LANE_CROSS: 'Drifted over lane line',
  SPEEDING: 'Exceeded speed limit',
  RAN_STOP_SIGN: 'Ran a stop sign',
  RAN_RED_LIGHT: 'Ran a red light',
  HIT_PARKED_CAR: 'Hit a parked car',
  HIT_TRAFFIC: 'Collided with traffic'
};

export type PointKey = keyof typeof POINTS;

/** Tracks score + every event during a level run. */
export class ScoreTracker {
  private counts = new Map<PointKey, number>();
  score = 0;

  add(key: PointKey): number {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    this.score = Math.max(0, this.score + POINTS[key]);
    return POINTS[key];
  }

  get events(): ScoreEvent[] {
    return [...this.counts.entries()]
      .map(([key, count]) => ({
        label: LABELS[key],
        points: POINTS[key] * count,
        count
      }))
      .sort((a, b) => b.points - a.points);
  }

  countOf(key: PointKey): number {
    return this.counts.get(key) ?? 0;
  }
}

function gradeFor(score: number, par: number): { grade: string; passed: boolean } {
  const r = score / par;
  if (r >= 1.0) return { grade: 'A+', passed: true };
  if (r >= 0.85) return { grade: 'A', passed: true };
  if (r >= 0.7) return { grade: 'B', passed: true };
  if (r >= 0.55) return { grade: 'C', passed: true };
  if (r >= 0.4) return { grade: 'D', passed: false };
  return { grade: 'F', passed: false };
}

/** Builds the Instructor Report Card content from a finished run. */
export function buildResult(level: LevelConfig, tracker: ScoreTracker): LevelResult {
  const { grade, passed } = gradeFor(tracker.score, level.parScore);
  const feedback: string[] = [];

  const faults =
    tracker.countOf('HIT_CONE') +
    tracker.countOf('HIT_PARKED_CAR') +
    tracker.countOf('HIT_TRAFFIC');

  if (faults === 0) feedback.push('Zero collisions — excellent vehicle control.');
  else if (faults <= 2) feedback.push('A couple of bumps. Leave more space around obstacles.');
  else feedback.push('Too many collisions. Slow down and scan further ahead.');

  if (tracker.countOf('RAN_STOP_SIGN') + tracker.countOf('RAN_RED_LIGHT') === 0) {
    feedback.push('Perfect on signs and signals. That is real road-test discipline.');
  } else {
    feedback.push('Come to a complete stop — rolling stops fail a real road test.');
  }

  if (tracker.countOf('SPEEDING') === 0) {
    feedback.push(`Held the ${level.speedLimit} mph limit the whole way. Nice.`);
  } else {
    feedback.push(`Watch the speedometer — the limit here is ${level.speedLimit} mph.`);
  }

  if (tracker.countOf('LANE_CROSS') <= 1) {
    feedback.push('Strong lane discipline.');
  } else {
    feedback.push('Keep the car centered — you crossed lane lines several times.');
  }

  if (passed) {
    feedback.push('Instructor verdict: PASS. Ready for the next lesson!');
  } else {
    feedback.push('Instructor verdict: NEEDS PRACTICE. Book a lesson and try again!');
  }

  return {
    levelId: level.id,
    levelName: level.name,
    score: tracker.score,
    grade,
    events: tracker.events,
    feedback,
    passed
  };
}
