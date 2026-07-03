/** Shared types for the DrivingKlass Road Test Challenge. */

export type ObstacleType =
  | 'cone'
  | 'stopSign'
  | 'trafficLight'
  | 'parkedCar'
  | 'traffic'
  | 'checkpoint';

export interface LevelConfig {
  id: string;
  name: string;
  subtitle: string;
  /** Total course length in "distance units" (px of world scroll). */
  length: number;
  /** Speed limit in mph. Driving above it for too long is a fault. */
  speedLimit: number;
  /** Max speed the car can reach in this level (mph). */
  maxSpeed: number;
  /** Which obstacle types this level uses. */
  features: ObstacleType[];
  /** Approx. gap between random obstacles (smaller = denser). */
  obstacleGap: number;
  /** Score needed for an A grade. Used to scale grading per level. */
  parScore: number;
  /** Ambient shoulder color: parking-lot concrete vs. neighborhood grass. */
  shoulderColor: number;
}

/** One line item on the Instructor Report Card. */
export interface ScoreEvent {
  label: string;
  points: number; // positive = earned, negative = fault
  count: number;
}

export interface LevelResult {
  levelId: string;
  levelName: string;
  score: number;
  grade: string;
  events: ScoreEvent[];
  feedback: string[];
  passed: boolean;
}

/** Events the Phaser scene emits up to React. */
export const GAME_EVENTS = {
  LEVEL_COMPLETE: 'dk-level-complete',
  HUD_UPDATE: 'dk-hud-update'
} as const;
