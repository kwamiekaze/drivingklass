// Realistic car physics engine for DrivingKlass

import { CarState, PhysicsConfig, Vector2D } from './types';

// Default physics config - tuned for realistic, heavy sedan feel
export const DEFAULT_PHYSICS: PhysicsConfig = {
  maxSpeed: 180, // pixels per second (~45 mph visual)
  maxReverseSpeed: 60,
  acceleration: 80, // slow acceleration for realism
  brakeForce: 200,
  friction: 0.98, // ground friction
  turnRate: 2.2, // degrees per second at full speed
  drag: 0.995, // air resistance
  mass: 1500, // kg - heavy sedan
  minTurnSpeed: 5, // minimum speed to turn
};

export function createInitialCarState(startPosition: Vector2D): CarState {
  return {
    position: { ...startPosition },
    velocity: { x: 0, y: 0 },
    rotation: -Math.PI / 2, // facing up
    speed: 0,
    acceleration: 0,
    brakePressure: 0,
    steeringAngle: 0,
    leftBlinker: false,
    rightBlinker: false,
    blinkerStartTime: null,
    isReversing: false,
    lastBlindSpotCheck: 0,
  };
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
  reverse: boolean;
}

export function updateCarPhysics(
  car: CarState,
  input: InputState,
  config: PhysicsConfig,
  deltaTime: number
): CarState {
  const dt = deltaTime / 1000; // convert to seconds
  const newCar = { ...car };

  // Calculate acceleration/deceleration
  let accelerationForce = 0;

  if (input.accelerate && !input.handbrake) {
    if (car.isReversing) {
      // Slowing down from reverse
      accelerationForce = config.brakeForce * 0.5;
      newCar.isReversing = car.speed > 5;
    } else {
      accelerationForce = config.acceleration;
    }
  } else if (input.brake || input.reverse) {
    if (car.speed > 5) {
      // Apply brakes
      accelerationForce = -config.brakeForce;
      newCar.brakePressure = Math.min(1, car.brakePressure + dt * 3);
    } else if (input.reverse) {
      // Start reversing
      newCar.isReversing = true;
      accelerationForce = -config.acceleration * 0.5;
    }
  } else {
    newCar.brakePressure = Math.max(0, car.brakePressure - dt * 5);
  }

  // Apply handbrake
  if (input.handbrake) {
    accelerationForce = -config.brakeForce * 1.5;
    newCar.brakePressure = 1;
  }

  // Update speed with acceleration
  let newSpeed = car.speed + accelerationForce * dt;

  // Apply friction and drag
  newSpeed *= config.friction;
  newSpeed *= config.drag;

  // Clamp speed
  const maxSpd = car.isReversing ? -config.maxReverseSpeed : config.maxSpeed;
  if (car.isReversing) {
    newSpeed = Math.max(newSpeed, -config.maxReverseSpeed);
    if (newSpeed >= 0) {
      newSpeed = 0;
      newCar.isReversing = false;
    }
  } else {
    newSpeed = Math.max(0, Math.min(newSpeed, config.maxSpeed));
  }

  // Stop if very slow
  if (Math.abs(newSpeed) < 1 && !input.accelerate && !input.reverse) {
    newSpeed = 0;
  }

  newCar.speed = newSpeed;
  newCar.acceleration = accelerationForce;

  // Steering - only works when moving
  const speedFactor = Math.min(1, Math.abs(car.speed) / 50);
  const turnMultiplier = car.isReversing ? -1 : 1;

  if (Math.abs(car.speed) > config.minTurnSpeed) {
    if (input.steerLeft) {
      newCar.steeringAngle = -config.turnRate * speedFactor * turnMultiplier;
    } else if (input.steerRight) {
      newCar.steeringAngle = config.turnRate * speedFactor * turnMultiplier;
    } else {
      // Return steering to center
      newCar.steeringAngle = car.steeringAngle * 0.85;
    }
  } else {
    newCar.steeringAngle = car.steeringAngle * 0.9;
  }

  // Clamp steering
  newCar.steeringAngle = Math.max(-config.turnRate, Math.min(config.turnRate, newCar.steeringAngle));

  // Update rotation based on steering and speed
  // Heavy car = less responsive steering at high speeds
  const steeringEfficiency = 1 - (Math.abs(car.speed) / config.maxSpeed) * 0.3;
  newCar.rotation = car.rotation + (newCar.steeringAngle * dt * steeringEfficiency);

  // Update velocity based on rotation and speed
  const direction = car.isReversing ? Math.PI : 0;
  newCar.velocity = {
    x: Math.cos(newCar.rotation + direction) * Math.abs(newCar.speed),
    y: Math.sin(newCar.rotation + direction) * Math.abs(newCar.speed),
  };

  // Update position
  newCar.position = {
    x: car.position.x + newCar.velocity.x * dt,
    y: car.position.y + newCar.velocity.y * dt,
  };

  return newCar;
}

// Convert pixels per second to MPH for display
export function speedToMPH(pixelsPerSecond: number): number {
  // 4 pixels = 1 foot, so ~21 pixels = 1 meter
  // 1 m/s = 2.237 mph
  return Math.abs(pixelsPerSecond) * 0.25; // Adjusted for game feel
}

// Check if acceleration was too aggressive
export function detectHardAcceleration(prevSpeed: number, currentSpeed: number, deltaTime: number): boolean {
  const accelerationRate = (currentSpeed - prevSpeed) / (deltaTime / 1000);
  return accelerationRate > 100; // threshold for "flooring it"
}

// Check if braking was too aggressive
export function detectHardBraking(prevSpeed: number, currentSpeed: number, deltaTime: number): boolean {
  const decelerationRate = (prevSpeed - currentSpeed) / (deltaTime / 1000);
  return decelerationRate > 150 && prevSpeed > 30; // hard brake threshold
}

// Calculate distance to object in front
export function raycastForward(
  carPosition: Vector2D,
  carRotation: number,
  obstacles: { position: Vector2D; width: number; height: number }[],
  maxDistance: number = 200
): number | null {
  const rayEnd = {
    x: carPosition.x + Math.cos(carRotation) * maxDistance,
    y: carPosition.y + Math.sin(carRotation) * maxDistance,
  };

  let closestDistance: number | null = null;

  for (const obstacle of obstacles) {
    // Simple AABB intersection with ray
    const dist = distanceToRect(carPosition, rayEnd, obstacle);
    if (dist !== null && (closestDistance === null || dist < closestDistance)) {
      closestDistance = dist;
    }
  }

  return closestDistance;
}

function distanceToRect(
  rayStart: Vector2D,
  rayEnd: Vector2D,
  rect: { position: Vector2D; width: number; height: number }
): number | null {
  // Simplified ray-box intersection
  const rectCenter = rect.position;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  const dx = rayEnd.x - rayStart.x;
  const dy = rayEnd.y - rayStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Check if ray intersects rectangle
  const closestX = Math.max(rectCenter.x - halfW, Math.min(rayStart.x, rectCenter.x + halfW));
  const closestY = Math.max(rectCenter.y - halfH, Math.min(rayStart.y, rectCenter.y + halfH));

  const distX = rayStart.x - closestX;
  const distY = rayStart.y - closestY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  if (distance < length) {
    return distance;
  }

  return null;
}

// AABB collision detection
export function checkCollision(
  car: { position: Vector2D; width: number; height: number; rotation: number },
  obstacle: { position: Vector2D; width: number; height: number }
): boolean {
  // Simplified AABB (axis-aligned bounding box) collision
  const carHalfW = car.width / 2;
  const carHalfH = car.height / 2;
  const obsHalfW = obstacle.width / 2;
  const obsHalfH = obstacle.height / 2;

  return (
    Math.abs(car.position.x - obstacle.position.x) < carHalfW + obsHalfW &&
    Math.abs(car.position.y - obstacle.position.y) < carHalfH + obsHalfH
  );
}

// Get car corners for more accurate collision
export function getCarCorners(position: Vector2D, width: number, height: number, rotation: number): Vector2D[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const hw = width / 2;
  const hh = height / 2;

  return [
    { x: position.x + cos * hw - sin * hh, y: position.y + sin * hw + cos * hh },
    { x: position.x - cos * hw - sin * hh, y: position.y - sin * hw + cos * hh },
    { x: position.x - cos * hw + sin * hh, y: position.y - sin * hw - cos * hh },
    { x: position.x + cos * hw + sin * hh, y: position.y + sin * hw - cos * hh },
  ];
}
