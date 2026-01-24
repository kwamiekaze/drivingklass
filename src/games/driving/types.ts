// Core game types for DrivingKlass simulation

export interface Vector2D {
  x: number;
  y: number;
}

export interface CarState {
  position: Vector2D;
  velocity: Vector2D;
  rotation: number; // radians
  speed: number; // current speed in pixels per second
  acceleration: number;
  brakePressure: number;
  steeringAngle: number;
  leftBlinker: boolean;
  rightBlinker: boolean;
  blinkerStartTime: number | null;
  isReversing: boolean;
  lastBlindSpotCheck: number;
}

export interface PhysicsConfig {
  maxSpeed: number; // max forward speed
  maxReverseSpeed: number;
  acceleration: number;
  brakeForce: number;
  friction: number;
  turnRate: number;
  drag: number;
  mass: number; // affects "heaviness"
  minTurnSpeed: number; // speed required to turn
}

export interface TrafficLight {
  id: string;
  position: Vector2D;
  state: 'red' | 'yellow' | 'green';
  timer: number;
}

export interface StopSign {
  id: string;
  position: Vector2D;
  direction: number; // facing direction in radians
}

export interface SpeedZone {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  limit: number; // mph
  type: 'city' | 'highway' | 'school';
}

export interface ParkingSpot {
  id: string;
  position: Vector2D;
  rotation: number;
  width: number;
  height: number;
  type: 'perpendicular' | 'parallel' | 'reverse';
  isTarget: boolean;
}

export interface Lane {
  id: string;
  points: Vector2D[];
  width: number;
  direction: 'north' | 'south' | 'east' | 'west';
}

export interface AIVehicle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  speed: number;
  targetSpeed: number;
  currentLane: string | null;
  width: number;
  height: number;
  color: string;
}

export interface GameMap {
  width: number;
  height: number;
  roads: Road[];
  lanes: Lane[];
  trafficLights: TrafficLight[];
  stopSigns: StopSign[];
  speedZones: SpeedZone[];
  parkingSpots: ParkingSpot[];
  buildings: Building[];
}

export interface Road {
  id: string;
  start: Vector2D;
  end: Vector2D;
  width: number;
  lanes: number;
  isHighway: boolean;
}

export interface Building {
  id: string;
  position: Vector2D;
  width: number;
  height: number;
  color: string;
}

export interface SessionScore {
  acceleration: number;
  braking: number;
  leftTurns: number;
  rightTurns: number;
  speedMaintenance: number;
  laneMaintenance: number;
  blindSpots: number;
  signalUsage: number;
  changingLanes: number;
  followingDistance: number;
  roadSignAwareness: number;
  distractions: number;
  generalParking: number;
  reverseParking: number;
  parallelParking: number;
  straightLineBacking: number;
  turnAbout: number;
  merging: number;
  interstate: number;
  overall: number;
}

export interface Violation {
  skill: keyof SessionScore;
  message: string;
  deduction: number;
  timestamp: number;
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  gameTime: number;
  car: CarState;
  aiVehicles: AIVehicle[];
  score: SessionScore;
  violations: Violation[];
  currentObjective: string;
  currentSpeedLimit: number;
  showDistraction: boolean;
  distractionType: 'phone' | null;
  parkingMode: 'perpendicular' | 'parallel' | 'reverse' | 'straightBack' | 'turnAbout' | null;
  isOnHighway: boolean;
  gameOver: boolean;
}

export interface GameSettings {
  trafficDensity: 'low' | 'medium' | 'high';
  weatherCondition: 'clear' | 'rain';
  difficulty: 'easy' | 'normal' | 'hard';
}

export const SKILL_LABELS: Record<keyof Omit<SessionScore, 'overall'>, string> = {
  acceleration: 'Acceleration',
  braking: 'Braking',
  leftTurns: 'Left Turns',
  rightTurns: 'Right Turns',
  speedMaintenance: 'Speed Maintenance',
  laneMaintenance: 'Lane Maintenance',
  blindSpots: 'Blind Spots',
  signalUsage: 'Signal Usage',
  changingLanes: 'Changing Lanes',
  followingDistance: 'Following Distance',
  roadSignAwareness: 'Road Sign Awareness',
  distractions: 'Distractions',
  generalParking: 'General Parking',
  reverseParking: 'Reverse Parking',
  parallelParking: 'Parallel Parking',
  straightLineBacking: 'Straight Line Backing',
  turnAbout: 'Turn About',
  merging: 'Merging',
  interstate: 'Interstate',
};
