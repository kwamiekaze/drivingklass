// Scoring engine for DrivingKlass driving simulation

import { SessionScore, Violation, CarState, AIVehicle, SpeedZone } from './types';
import { speedToMPH, detectHardAcceleration, detectHardBraking, raycastForward } from './physics';

export function createInitialScore(): SessionScore {
  return {
    acceleration: 10,
    braking: 10,
    leftTurns: 10,
    rightTurns: 10,
    speedMaintenance: 10,
    laneMaintenance: 10,
    blindSpots: 10,
    signalUsage: 10,
    changingLanes: 10,
    followingDistance: 10,
    roadSignAwareness: 10,
    distractions: 10,
    generalParking: 10,
    reverseParking: 10,
    parallelParking: 10,
    straightLineBacking: 10,
    turnAbout: 10,
    merging: 10,
    interstate: 10,
    overall: 10,
  };
}

export function calculateOverallScore(score: SessionScore): number {
  const skills = Object.entries(score).filter(([key]) => key !== 'overall');
  const sum = skills.reduce((acc, [, value]) => acc + value, 0);
  return Math.round((sum / skills.length) * 10) / 10;
}

export function deductPoints(
  score: SessionScore,
  skill: keyof SessionScore,
  amount: number,
  message: string,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  const newScore = { ...score };
  newScore[skill] = Math.max(0, score[skill] - amount);
  newScore.overall = calculateOverallScore(newScore);

  const newViolations = [
    ...violations,
    {
      skill,
      message,
      deduction: amount,
      timestamp: Date.now(),
    },
  ];

  return { score: newScore, violations: newViolations };
}

// Scoring state to prevent rapid repeated deductions
interface ScoringState {
  lastAccelerationCheck: number;
  lastBrakingCheck: number;
  lastSpeedCheck: number;
  lastLaneCheck: number;
  lastFollowingCheck: number;
  lastSignalWarning: number;
  laneChangeStartTime: number | null;
  turnStartTime: number | null;
  turnDirection: 'left' | 'right' | null;
  prevSpeed: number;
  prevRotation: number;
}

export function createScoringState(): ScoringState {
  return {
    lastAccelerationCheck: 0,
    lastBrakingCheck: 0,
    lastSpeedCheck: 0,
    lastLaneCheck: 0,
    lastFollowingCheck: 0,
    lastSignalWarning: 0,
    laneChangeStartTime: null,
    turnStartTime: null,
    turnDirection: null,
    prevSpeed: 0,
    prevRotation: 0,
  };
}

export function evaluateDriving(
  car: CarState,
  prevCar: CarState,
  score: SessionScore,
  violations: Violation[],
  scoringState: ScoringState,
  aiVehicles: AIVehicle[],
  currentSpeedLimit: number,
  isOnLaneLine: boolean,
  gameTime: number,
  deltaTime: number
): { score: SessionScore; violations: Violation[]; scoringState: ScoringState } {
  let newScore = { ...score };
  let newViolations = [...violations];
  const newScoringState = { ...scoringState };
  const now = gameTime;

  // 1. ACCELERATION - Check for "flooring it"
  if (now - scoringState.lastAccelerationCheck > 500) {
    if (detectHardAcceleration(scoringState.prevSpeed, car.speed, deltaTime)) {
      const result = deductPoints(newScore, 'acceleration', 0.5, 'Accelerated too aggressively', newViolations);
      newScore = result.score;
      newViolations = result.violations;
    }
    newScoringState.lastAccelerationCheck = now;
  }

  // 2. BRAKING - Check for hard stops
  if (now - scoringState.lastBrakingCheck > 500) {
    if (detectHardBraking(scoringState.prevSpeed, car.speed, deltaTime)) {
      const result = deductPoints(newScore, 'braking', 0.5, 'Braked too hard', newViolations);
      newScore = result.score;
      newViolations = result.violations;
    }
    newScoringState.lastBrakingCheck = now;
  }

  // 3-4. TURNS - Detect turning (significant rotation change)
  const rotationDelta = Math.abs(car.rotation - prevCar.rotation);
  if (rotationDelta > 0.05 && car.speed > 20) {
    const turningLeft = car.rotation < prevCar.rotation;
    
    // Check if blinker was on before turn
    if (!scoringState.turnStartTime) {
      newScoringState.turnStartTime = now;
      newScoringState.turnDirection = turningLeft ? 'left' : 'right';
      
      // Check blinker
      const correctBlinker = turningLeft ? car.leftBlinker : car.rightBlinker;
      const blinkerOnTime = car.blinkerStartTime ? now - car.blinkerStartTime : 0;
      
      if (!correctBlinker || blinkerOnTime < 3000) {
        const result = deductPoints(
          newScore,
          'signalUsage',
          0.5,
          `Turned ${turningLeft ? 'left' : 'right'} without proper signal`,
          newViolations
        );
        newScore = result.score;
        newViolations = result.violations;
      }
    }
  } else if (scoringState.turnStartTime && rotationDelta < 0.01) {
    // Turn completed
    newScoringState.turnStartTime = null;
    newScoringState.turnDirection = null;
  }

  // 5. SPEED MAINTENANCE - Check if exceeding speed limit
  const currentMPH = speedToMPH(car.speed);
  if (now - scoringState.lastSpeedCheck > 2000) {
    if (currentMPH > currentSpeedLimit + 5) {
      const result = deductPoints(
        newScore,
        'speedMaintenance',
        0.3,
        `Exceeding speed limit (${Math.round(currentMPH)} in ${currentSpeedLimit} zone)`,
        newViolations
      );
      newScore = result.score;
      newViolations = result.violations;
    }
    newScoringState.lastSpeedCheck = now;
  }

  // 6. LANE MAINTENANCE - Check if touching lane line without blinker
  if (isOnLaneLine && now - scoringState.lastLaneCheck > 1000) {
    if (!car.leftBlinker && !car.rightBlinker) {
      const result = deductPoints(newScore, 'laneMaintenance', 0.3, 'Crossed lane line without signaling', newViolations);
      newScore = result.score;
      newViolations = result.violations;
    }
    newScoringState.lastLaneCheck = now;
  }

  // 9. FOLLOWING DISTANCE - Raycast forward
  if (car.speed > 30 && now - scoringState.lastFollowingCheck > 1000) {
    const obstacles = aiVehicles.map(v => ({
      position: v.position,
      width: v.width,
      height: v.height,
    }));
    
    const distance = raycastForward(car.position, car.rotation, obstacles, 200);
    
    if (distance !== null && distance < 40) {
      const result = deductPoints(newScore, 'followingDistance', 0.5, 'Following too closely', newViolations);
      newScore = result.score;
      newViolations = result.violations;
    }
    newScoringState.lastFollowingCheck = now;
  }

  // Update state for next frame
  newScoringState.prevSpeed = car.speed;
  newScoringState.prevRotation = car.rotation;

  return {
    score: newScore,
    violations: newViolations,
    scoringState: newScoringState,
  };
}

// Check for traffic law violations
export function checkTrafficViolation(
  type: 'stopSign' | 'redLight',
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  return deductPoints(
    score,
    'roadSignAwareness',
    2,
    type === 'stopSign' ? 'Ran a stop sign' : 'Ran a red light',
    violations
  );
}

// Handle distraction interaction
export function handleDistraction(
  clickedDistraction: boolean,
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  if (clickedDistraction) {
    return deductPoints(score, 'distractions', 2, 'Got distracted by phone', violations);
  }
  return { score, violations };
}

// Evaluate blind spot check
export function evaluateBlindSpotCheck(
  car: CarState,
  wasLaneChange: boolean,
  timeSinceBlindSpotCheck: number,
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  if (wasLaneChange && timeSinceBlindSpotCheck > 2000) {
    return deductPoints(score, 'blindSpots', 1, 'Changed lanes without checking blind spots', violations);
  }
  return { score, violations };
}

// Evaluate lane change safety
export function evaluateLaneChange(
  car: CarState,
  aiVehicles: AIVehicle[],
  hadSignal: boolean,
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  let newScore = score;
  let newViolations = violations;

  // Check for nearby vehicles
  const nearbyVehicle = aiVehicles.find(v => {
    const dx = v.position.x - car.position.x;
    const dy = v.position.y - car.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 60;
  });

  if (nearbyVehicle) {
    const result = deductPoints(newScore, 'changingLanes', 1, 'Unsafe lane change - too close to another vehicle', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  if (!hadSignal) {
    const result = deductPoints(newScore, 'signalUsage', 0.5, 'Lane change without signal', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  return { score: newScore, violations: newViolations };
}

// Parking evaluation
export function evaluateParking(
  type: 'general' | 'reverse' | 'parallel',
  distanceFromCenter: number,
  angleDeviation: number,
  hitCurb: boolean,
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  let newScore = score;
  let newViolations = violations;
  const skillKey = type === 'general' ? 'generalParking' : type === 'reverse' ? 'reverseParking' : 'parallelParking';

  // Distance penalty
  if (distanceFromCenter > 20) {
    const result = deductPoints(newScore, skillKey, 1, 'Parked too far from center', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  // Angle penalty
  if (angleDeviation > 15) {
    const result = deductPoints(newScore, skillKey, 1, 'Parked at an angle', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  // Curb penalty
  if (hitCurb) {
    const result = deductPoints(newScore, skillKey, 2, 'Hit the curb while parking', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  return { score: newScore, violations: newViolations };
}

// Highway merging evaluation
export function evaluateMerging(
  mergeSpeed: number,
  requiredSpeed: number,
  cutOffVehicle: boolean,
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[] } {
  let newScore = score;
  let newViolations = violations;

  if (mergeSpeed < requiredSpeed - 10) {
    const result = deductPoints(newScore, 'merging', 1, 'Merged too slowly', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  if (cutOffVehicle) {
    const result = deductPoints(newScore, 'merging', 2, 'Cut off another vehicle while merging', newViolations);
    newScore = result.score;
    newViolations = result.violations;
  }

  return { score: newScore, violations: newViolations };
}

// Interstate driving evaluation
export function evaluateInterstateSpeed(
  currentSpeed: number,
  minimumSpeed: number,
  gameTime: number,
  lastCheck: number,
  score: SessionScore,
  violations: Violation[]
): { score: SessionScore; violations: Violation[]; lastCheck: number } {
  if (gameTime - lastCheck < 5000) {
    return { score, violations, lastCheck };
  }

  const mph = speedToMPH(currentSpeed);
  if (mph < minimumSpeed) {
    const result = deductPoints(score, 'interstate', 0.5, 'Driving too slowly on interstate', violations);
    return { score: result.score, violations: result.violations, lastCheck: gameTime };
  }

  return { score, violations, lastCheck: gameTime };
}
