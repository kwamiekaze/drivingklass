/** Shared types for the DrivingKlass Road Test Challenge. */

export type ObstacleType =
  | 'cone'
  | 'stopSign'
  | 'trafficLight'
  | 'parkedCar'
  | 'traffic'
  | 'checkpoint'
  | 'star';

export type Difficulty = 'learner' | 'licensed' | 'instructor' | 'legend';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  lengthMul: number;
  gapMul: number;
  trafficMul: number;
  speedTolerance: number;
  scoreMul: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { id: 'learner',    label: 'Learner',    lengthMul: 1.0, gapMul: 1.0,  trafficMul: 1.0,  speedTolerance: 3, scoreMul: 1.0 },
  { id: 'licensed',   label: 'Licensed',   lengthMul: 1.4, gapMul: 0.8,  trafficMul: 1.1,  speedTolerance: 2, scoreMul: 1.25 },
  { id: 'instructor', label: 'Instructor', lengthMul: 1.8, gapMul: 0.65, trafficMul: 1.25, speedTolerance: 1, scoreMul: 1.5 },
  { id: 'legend',     label: 'Legend',     lengthMul: 2.3, gapMul: 0.5,  trafficMul: 1.4,  speedTolerance: 0, scoreMul: 2.0 },
];

export function getDifficulty(id: string | null | undefined): DifficultyConfig {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
}

export interface LevelConfig {
  id: string;
  name: string;
  subtitle: string;
  length: number;
  speedLimit: number;
  maxSpeed: number;
  features: ObstacleType[];
  obstacleGap: number;
  parScore: number;
  shoulderColor: number;
  nightAlpha?: number;
  endless?: boolean;
}

export interface ScoreEvent {
  label: string;
  points: number;
  count: number;
}

export interface LevelResult {
  levelId: string;
  levelName: string;
  difficulty: Difficulty;
  score: number;          // final, post-multiplier
  rawScore: number;       // pre-multiplier
  multiplier: number;
  grade: string;
  events: ScoreEvent[];
  feedback: string[];
  passed: boolean;
  distance?: number;      // for endless mode
  isNewBest?: boolean;
  previousBest?: number;
}

export const GAME_EVENTS = {
  LEVEL_COMPLETE: 'dk-level-complete',
  HUD_UPDATE: 'dk-hud-update'
} as const;
