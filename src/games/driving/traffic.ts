// AI Traffic system for DrivingKlass

import { AIVehicle, Lane, TrafficLight, Vector2D } from './types';

const CAR_COLORS = ['#4a5568', '#2d3748', '#1a202c', '#742a2a', '#2c5282', '#285e61'];

export function createAIVehicles(count: number, lanes: Lane[]): AIVehicle[] {
  const vehicles: AIVehicle[] = [];
  
  for (let i = 0; i < count; i++) {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const t = Math.random();
    const startPoint = lane.points[0];
    const endPoint = lane.points[lane.points.length - 1];
    
    const position = {
      x: startPoint.x + (endPoint.x - startPoint.x) * t,
      y: startPoint.y + (endPoint.y - startPoint.y) * t,
    };
    
    // Calculate direction based on lane
    let rotation = 0;
    switch (lane.direction) {
      case 'north': rotation = -Math.PI / 2; break;
      case 'south': rotation = Math.PI / 2; break;
      case 'east': rotation = 0; break;
      case 'west': rotation = Math.PI; break;
    }
    
    vehicles.push({
      id: `ai-${i}`,
      position,
      velocity: { x: 0, y: 0 },
      rotation,
      speed: 60 + Math.random() * 40,
      targetSpeed: 80,
      currentLane: lane.id,
      width: 40,
      height: 24,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    });
  }
  
  return vehicles;
}

export function updateAIVehicles(
  vehicles: AIVehicle[],
  lanes: Lane[],
  trafficLights: TrafficLight[],
  playerPosition: Vector2D,
  deltaTime: number
): AIVehicle[] {
  const dt = deltaTime / 1000;
  
  return vehicles.map(vehicle => {
    const newVehicle = { ...vehicle };
    
    // Find current lane
    const lane = lanes.find(l => l.id === vehicle.currentLane);
    if (!lane || lane.points.length < 2) return vehicle;
    
    const start = lane.points[0];
    const end = lane.points[lane.points.length - 1];
    
    // Check for traffic lights ahead
    const shouldStop = trafficLights.some(light => {
      if (light.state !== 'red') return false;
      
      const dx = light.position.x - vehicle.position.x;
      const dy = light.position.y - vehicle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if light is ahead
      const toLight = Math.atan2(dy, dx);
      const angleDiff = Math.abs(toLight - vehicle.rotation);
      
      return distance < 100 && distance > 20 && angleDiff < Math.PI / 2;
    });
    
    // Check for vehicles ahead
    const vehicleAhead = vehicles.find(other => {
      if (other.id === vehicle.id) return false;
      
      const dx = other.position.x - vehicle.position.x;
      const dy = other.position.y - vehicle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if ahead
      const toOther = Math.atan2(dy, dx);
      const angleDiff = Math.abs(toOther - vehicle.rotation);
      
      return distance < 80 && angleDiff < Math.PI / 4;
    });
    
    // Check for player ahead
    const playerDx = playerPosition.x - vehicle.position.x;
    const playerDy = playerPosition.y - vehicle.position.y;
    const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
    const toPlayer = Math.atan2(playerDy, playerDx);
    const playerAngleDiff = Math.abs(toPlayer - vehicle.rotation);
    const playerAhead = playerDistance < 100 && playerAngleDiff < Math.PI / 4;
    
    // Adjust speed
    if (shouldStop || vehicleAhead || playerAhead) {
      newVehicle.speed = Math.max(0, vehicle.speed - 150 * dt);
    } else if (vehicle.speed < vehicle.targetSpeed) {
      newVehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + 50 * dt);
    }
    
    // Move along lane
    newVehicle.velocity = {
      x: Math.cos(vehicle.rotation) * newVehicle.speed,
      y: Math.sin(vehicle.rotation) * newVehicle.speed,
    };
    
    newVehicle.position = {
      x: vehicle.position.x + newVehicle.velocity.x * dt,
      y: vehicle.position.y + newVehicle.velocity.y * dt,
    };
    
    // Wrap around map
    const mapWidth = 3000;
    const mapHeight = 2400;
    
    if (newVehicle.position.x > mapWidth + 100) {
      newVehicle.position.x = -50;
    } else if (newVehicle.position.x < -100) {
      newVehicle.position.x = mapWidth + 50;
    }
    
    if (newVehicle.position.y > mapHeight + 100) {
      newVehicle.position.y = -50;
    } else if (newVehicle.position.y < -100) {
      newVehicle.position.y = mapHeight + 50;
    }
    
    return newVehicle;
  });
}

export function updateTrafficLights(lights: TrafficLight[], deltaTime: number): TrafficLight[] {
  const CYCLE_TIME = 8000; // 8 seconds per cycle
  
  return lights.map(light => {
    const newTimer = light.timer + deltaTime;
    let newState = light.state;
    
    if (newTimer >= CYCLE_TIME) {
      // Cycle through states
      switch (light.state) {
        case 'green':
          newState = 'yellow';
          break;
        case 'yellow':
          newState = 'red';
          break;
        case 'red':
          newState = 'green';
          break;
      }
      return { ...light, state: newState, timer: 0 };
    }
    
    // Yellow is short
    if (light.state === 'green' && newTimer >= CYCLE_TIME - 1500) {
      return { ...light, state: 'yellow', timer: newTimer };
    }
    
    return { ...light, timer: newTimer };
  });
}
