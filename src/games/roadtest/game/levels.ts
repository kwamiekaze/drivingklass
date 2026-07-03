import type { LevelConfig } from './types';

/**
 * The three DrivingKlass lessons, in order of difficulty.
 * Tune length / obstacleGap / speedLimit here — no scene code changes needed.
 */
export const LEVELS: LevelConfig[] = [
  {
    id: 'parking-lot',
    name: 'Parking Lot Practice',
    subtitle: 'Lesson 1 · Slow and steady around the cones',
    length: 6500,
    speedLimit: 25,
    maxSpeed: 40,
    features: ['cone', 'checkpoint', 'stopSign'],
    obstacleGap: 380,
    parScore: 700,
    shoulderColor: 0x4a4a50 // concrete lot
  },
  {
    id: 'neighborhood',
    name: 'Neighborhood Drive',
    subtitle: 'Lesson 2 · Stop signs, parked cars, watch your speed',
    length: 9000,
    speedLimit: 35,
    maxSpeed: 55,
    features: ['cone', 'stopSign', 'parkedCar', 'checkpoint', 'trafficLight'],
    obstacleGap: 330,
    parScore: 1000,
    shoulderColor: 0x3c5a34 // grass
  },
  {
    id: 'road-test',
    name: 'Road Test Challenge',
    subtitle: 'Final Exam · Live traffic, lights, everything at once',
    length: 12000,
    speedLimit: 45,
    maxSpeed: 65,
    features: [
      'cone',
      'stopSign',
      'parkedCar',
      'traffic',
      'trafficLight',
      'checkpoint'
    ],
    obstacleGap: 300,
    parScore: 1400,
    shoulderColor: 0x35414a // city asphalt shoulder
  }
];

export function getLevel(id: string): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
