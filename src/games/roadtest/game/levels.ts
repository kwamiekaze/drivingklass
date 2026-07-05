import type { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
  { id: 'endless', name: 'Rush Hour Endless', subtitle: 'How far can you go? Three car crashes and you\'re out', length: 999999, speedLimit: 45, maxSpeed: 65, features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'star'], obstacleGap: 260, parScore: 2000, shoulderColor: 0x2c3a44, endless: true },
  { id: 'parking-lot', name: 'Parking Lot Practice', subtitle: 'Lesson 1 · Slow and steady around the cones', length: 6000, speedLimit: 25, maxSpeed: 40, features: ['cone', 'checkpoint', 'stopSign', 'star'], obstacleGap: 400, parScore: 650, shoulderColor: 0x4a4a50 },
  { id: 'neighborhood', name: 'Neighborhood Drive', subtitle: 'Lesson 2 · Stop signs and parked cars', length: 8000, speedLimit: 35, maxSpeed: 55, features: ['cone', 'stopSign', 'parkedCar', 'checkpoint', 'star'], obstacleGap: 350, parScore: 900, shoulderColor: 0x3c5a34 },
  { id: 'school-zone', name: 'School Zone', subtitle: 'Lesson 3 · 25 mph, kids about — perfect stops only', length: 8500, speedLimit: 25, maxSpeed: 45, features: ['cone', 'stopSign', 'parkedCar', 'checkpoint', 'star'], obstacleGap: 300, parScore: 1000, shoulderColor: 0x4f6a3d },
  { id: 'downtown', name: 'Downtown Cruise', subtitle: 'Lesson 4 · Traffic lights and tight streets', length: 9000, speedLimit: 35, maxSpeed: 55, features: ['cone', 'trafficLight', 'parkedCar', 'checkpoint', 'star'], obstacleGap: 320, parScore: 1100, shoulderColor: 0x35414a },
  { id: 'rush-hour', name: 'Rush Hour', subtitle: 'Lesson 5 · Live traffic everywhere — keep your cool', length: 9500, speedLimit: 40, maxSpeed: 60, features: ['traffic', 'trafficLight', 'checkpoint', 'cone', 'star'], obstacleGap: 290, parScore: 1200, shoulderColor: 0x35414a },
  { id: 'night-shift', name: 'Night Shift', subtitle: 'Lesson 6 · Low visibility. Trust your training', length: 9500, speedLimit: 40, maxSpeed: 60, features: ['cone', 'stopSign', 'parkedCar', 'traffic', 'checkpoint', 'star'], obstacleGap: 300, parScore: 1250, shoulderColor: 0x141420, nightAlpha: 0.32 },
  { id: 'highway-run', name: 'Highway Run', subtitle: 'Lesson 7 · Higher speeds, higher stakes', length: 11000, speedLimit: 55, maxSpeed: 70, features: ['traffic', 'cone', 'checkpoint', 'star'], obstacleGap: 340, parScore: 1300, shoulderColor: 0x4a4a50 },
  { id: 'construction', name: 'Construction Zone', subtitle: 'Lesson 8 · Cones for days. Thread the needle', length: 10000, speedLimit: 30, maxSpeed: 50, features: ['cone', 'parkedCar', 'stopSign', 'checkpoint', 'star'], obstacleGap: 220, parScore: 1350, shoulderColor: 0x5a4a32 },
  { id: 'city-gauntlet', name: 'City Gauntlet', subtitle: 'Lesson 9 · Everything at once, dense and fast', length: 11500, speedLimit: 45, maxSpeed: 65, features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'checkpoint', 'star'], obstacleGap: 250, parScore: 1500, shoulderColor: 0x35414a },
  { id: 'road-test-final', name: 'Road Test Final', subtitle: 'Final Exam · The full 5-star DrivingKlass road test', length: 13000, speedLimit: 45, maxSpeed: 65, features: ['cone', 'stopSign', 'trafficLight', 'parkedCar', 'traffic', 'checkpoint', 'star'], obstacleGap: 240, parScore: 1700, shoulderColor: 0x2c3a44, nightAlpha: 0.18 }
];

export function getLevel(id: string): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[1];
}
