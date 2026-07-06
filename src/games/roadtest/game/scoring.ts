import type { LevelConfig, LevelResult, ScoreEvent, Difficulty, DifficultyConfig } from './types';

export const POINTS = {
  CHECKPOINT: 100,
  FULL_STOP: 75,
  GREEN_LIGHT: 25,
  SMOOTH_DRIVING: 25,
  FINISH_BONUS: 200,
  STAR: 25,
  NEAR_MISS: 15,
  PED_SAFE_PASS: 40,

  HIT_CONE: -50,
  LANE_CROSS: -30,
  SPEEDING: -40,
  RAN_STOP_SIGN: -100,
  RAN_RED_LIGHT: -120,
  HIT_PARKED_CAR: -100,
  HIT_TRAFFIC: -150,
  HIT_PEDESTRIAN: 0, // catastrophic — score is zeroed via tracker.zeroOut()
} as const;

const LABELS: Record<string, string> = {
  CHECKPOINT: 'Checkpoint reached',
  FULL_STOP: 'Full stop at stop sign',
  GREEN_LIGHT: 'Passed on green',
  SMOOTH_DRIVING: 'Smooth lane-keeping',
  FINISH_BONUS: 'Completed the course',
  STAR: 'Gold star collected',
  NEAR_MISS: 'Close call — nice reflexes',
  PED_SAFE_PASS: 'Yielded to a pedestrian',
  HIT_CONE: 'Hit a cone',
  LANE_CROSS: 'Drifted over lane line',
  SPEEDING: 'Exceeded speed limit',
  RAN_STOP_SIGN: 'Ran a stop sign',
  RAN_RED_LIGHT: 'Ran a red light',
  HIT_PARKED_CAR: 'Hit a parked car',
  HIT_TRAFFIC: 'Collided with traffic',
  HIT_PEDESTRIAN: '🛑 HIT A PEDESTRIAN — run void',
};

export type PointKey = keyof typeof POINTS;

/** Positive events that build the combo meter. */
const POSITIVE_COMBO: PointKey[] = ['STAR', 'CHECKPOINT', 'FULL_STOP', 'GREEN_LIGHT', 'SMOOTH_DRIVING', 'NEAR_MISS'];

export class ScoreTracker {
  private counts = new Map<PointKey, number>();
  private extras = 0; // e.g. distance bonus
  score = 0;
  combo = 1;
  starsCollected = 0;
  maxCombo = 1;
  voided = false; // set true if a run-ending event (pedestrian hit) occurred

  /** Adds an event; returns actual points awarded (after combo multiplier). */
  add(key: PointKey): number {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    const base: number = POINTS[key];
    let pts: number = base;
    if (base > 0) {
      pts = Math.round(base * this.combo);
      if (POSITIVE_COMBO.includes(key)) {
        this.combo = Math.min(5, this.combo + 1);
        this.maxCombo = Math.max(this.maxCombo, this.combo);
      }
    } else {
      this.combo = 1; // any fault resets
    }
    if (key === 'STAR') this.starsCollected++;
    this.score = Math.max(0, this.score + pts);
    return pts;
  }

  /** Catastrophic event — zero the score and mark the run void. */
  zeroOut(key: PointKey = 'HIT_PEDESTRIAN') {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    this.score = 0;
    this.extras = 0;
    this.combo = 1;
    this.voided = true;
  }

  addDistanceBonus(pts: number) {
    this.extras += pts;
    this.score += pts;
  }

  get events(): ScoreEvent[] {
    const arr = [...this.counts.entries()]
      .map(([key, count]) => ({
        label: LABELS[key],
        points: POINTS[key] * count,
        count
      }));
    if (this.extras > 0) arr.push({ label: 'Distance bonus', points: this.extras, count: 1 });
    return arr.sort((a, b) => b.points - a.points);
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

export function buildResult(
  level: LevelConfig,
  tracker: ScoreTracker,
  difficulty: DifficultyConfig,
  extras?: { distance?: number }
): LevelResult {
  const rawScore = tracker.score;
  const finalScore = Math.round(rawScore * difficulty.scoreMul);
  const { grade, passed } = gradeFor(finalScore, level.parScore);
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

  if (tracker.countOf('LANE_CROSS') <= 1) feedback.push('Strong lane discipline.');
  else feedback.push('Keep the car centered — you crossed lane lines several times.');

  if (tracker.starsCollected > 0) {
    feedback.push(`Collected ${tracker.starsCollected} gold star${tracker.starsCollected === 1 ? '' : 's'}. Bonus points!`);
  }
  if (tracker.maxCombo >= 3) feedback.push(`Best combo streak: ×${tracker.maxCombo}. Momentum matters!`);

  feedback.push(passed
    ? 'Instructor verdict: PASS. Ready for the next lesson!'
    : 'Instructor verdict: NEEDS PRACTICE. Book a lesson and try again!');

  return {
    levelId: level.id,
    levelName: level.name,
    difficulty: difficulty.id,
    score: finalScore,
    rawScore,
    multiplier: difficulty.scoreMul,
    grade,
    events: tracker.events,
    feedback,
    passed,
    distance: extras?.distance,
  };
}
