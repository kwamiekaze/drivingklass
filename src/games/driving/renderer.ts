// Canvas renderer for DrivingKlass driving simulation

import { 
  GameMap, 
  CarState, 
  AIVehicle, 
  TrafficLight, 
  StopSign, 
  ParkingSpot,
  Vector2D,
  SpeedZone,
} from './types';
import { getCarCorners } from './physics';

const CAR_WIDTH = 45;
const CAR_HEIGHT = 22;

export function renderGame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  map: GameMap,
  car: CarState,
  aiVehicles: AIVehicle[],
  cameraOffset: Vector2D,
  isRaining: boolean
) {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply camera transform
  ctx.save();
  ctx.translate(-cameraOffset.x, -cameraOffset.y);

  // Draw map elements in order
  drawRoads(ctx, map);
  drawLaneMarkings(ctx, map);
  drawBuildings(ctx, map);
  drawSpeedZones(ctx, map.speedZones);
  drawParkingSpots(ctx, map.parkingSpots);
  drawStopSigns(ctx, map.stopSigns);
  drawTrafficLights(ctx, map.trafficLights);
  
  // Draw vehicles
  drawAIVehicles(ctx, aiVehicles);
  drawPlayerCar(ctx, car);
  
  // Weather effects
  if (isRaining) {
    drawRain(ctx, cameraOffset, canvas.width, canvas.height);
  }

  ctx.restore();
}

function drawRoads(ctx: CanvasRenderingContext2D, map: GameMap) {
  ctx.fillStyle = '#2d2d3a';
  
  for (const road of map.roads) {
    if (road.start.x === road.end.x) {
      // Vertical road
      ctx.fillRect(
        road.start.x - road.width / 2,
        Math.min(road.start.y, road.end.y),
        road.width,
        Math.abs(road.end.y - road.start.y)
      );
    } else {
      // Horizontal road
      ctx.fillRect(
        Math.min(road.start.x, road.end.x),
        road.start.y - road.width / 2,
        Math.abs(road.end.x - road.start.x),
        road.width
      );
    }
    
    // Highway markings
    if (road.isHighway) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.moveTo(road.start.x, road.start.y);
      ctx.lineTo(road.end.x, road.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawLaneMarkings(ctx: CanvasRenderingContext2D, map: GameMap) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 10]);
  
  for (const lane of map.lanes) {
    if (lane.points.length < 2) continue;
    
    ctx.beginPath();
    ctx.moveTo(lane.points[0].x, lane.points[0].y);
    
    for (let i = 1; i < lane.points.length; i++) {
      ctx.lineTo(lane.points[i].x, lane.points[i].y);
    }
    
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
}

function drawBuildings(ctx: CanvasRenderingContext2D, map: GameMap) {
  for (const building of map.buildings) {
    // Building shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(
      building.position.x - building.width / 2 + 5,
      building.position.y - building.height / 2 + 5,
      building.width,
      building.height
    );
    
    // Building
    ctx.fillStyle = building.color;
    ctx.fillRect(
      building.position.x - building.width / 2,
      building.position.y - building.height / 2,
      building.width,
      building.height
    );
    
    // Building roof detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(
      building.position.x - building.width / 2 + 5,
      building.position.y - building.height / 2 + 5,
      building.width - 10,
      10
    );
  }
}

function drawSpeedZones(ctx: CanvasRenderingContext2D, zones: SpeedZone[]) {
  for (const zone of zones) {
    if (zone.type === 'school') {
      // School zone highlight
      ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
      ctx.fillRect(zone.bounds.x, zone.bounds.y, zone.bounds.width, zone.bounds.height);
      
      ctx.strokeStyle = '#ffc107';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(zone.bounds.x, zone.bounds.y, zone.bounds.width, zone.bounds.height);
      ctx.setLineDash([]);
      
      // School zone sign
      ctx.fillStyle = '#ffc107';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCHOOL ZONE', zone.bounds.x + zone.bounds.width / 2, zone.bounds.y + 20);
      ctx.fillText(`${zone.limit} MPH`, zone.bounds.x + zone.bounds.width / 2, zone.bounds.y + 38);
    } else if (zone.type === 'highway') {
      // Subtle highway indication
      ctx.fillStyle = 'rgba(100, 200, 255, 0.05)';
      ctx.fillRect(zone.bounds.x, zone.bounds.y, zone.bounds.width, zone.bounds.height);
    }
  }
}

function drawParkingSpots(ctx: CanvasRenderingContext2D, spots: ParkingSpot[]) {
  for (const spot of spots) {
    ctx.save();
    ctx.translate(spot.position.x, spot.position.y);
    ctx.rotate(spot.rotation);
    
    // Parking space outline
    if (spot.isTarget) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    } else {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'transparent';
    }
    
    ctx.fillRect(-spot.width / 2, -spot.height / 2, spot.width, spot.height);
    ctx.strokeRect(-spot.width / 2, -spot.height / 2, spot.width, spot.height);
    
    // Parking type label for targets
    if (spot.isTarget) {
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spot.type.toUpperCase(), 0, 4);
    }
    
    ctx.restore();
  }
}

function drawStopSigns(ctx: CanvasRenderingContext2D, signs: StopSign[]) {
  for (const sign of signs) {
    ctx.save();
    ctx.translate(sign.position.x, sign.position.y);
    
    // Octagon stop sign
    const size = 15;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 4) - Math.PI / 8;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    
    // STOP text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOP', 0, 0);
    
    ctx.restore();
  }
}

function drawTrafficLights(ctx: CanvasRenderingContext2D, lights: TrafficLight[]) {
  for (const light of lights) {
    ctx.save();
    ctx.translate(light.position.x, light.position.y);
    
    // Light housing
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-8, -20, 16, 40);
    
    // Red light
    ctx.fillStyle = light.state === 'red' ? '#ef4444' : '#4a0000';
    ctx.beginPath();
    ctx.arc(0, -12, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Yellow light
    ctx.fillStyle = light.state === 'yellow' ? '#fbbf24' : '#4a4a00';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Green light
    ctx.fillStyle = light.state === 'green' ? '#22c55e' : '#004a00';
    ctx.beginPath();
    ctx.arc(0, 12, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

function drawAIVehicles(ctx: CanvasRenderingContext2D, vehicles: AIVehicle[]) {
  for (const vehicle of vehicles) {
    ctx.save();
    ctx.translate(vehicle.position.x, vehicle.position.y);
    ctx.rotate(vehicle.rotation);
    
    // Car body
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(-vehicle.width / 2, -vehicle.height / 2, vehicle.width, vehicle.height);
    
    // Windshield
    ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.fillRect(vehicle.width / 4, -vehicle.height / 3, 8, vehicle.height * 0.66);
    
    // Tail lights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-vehicle.width / 2, -vehicle.height / 2 + 2, 4, 4);
    ctx.fillRect(-vehicle.width / 2, vehicle.height / 2 - 6, 4, 4);
    
    ctx.restore();
  }
}

function drawPlayerCar(ctx: CanvasRenderingContext2D, car: CarState) {
  ctx.save();
  ctx.translate(car.position.x, car.position.y);
  ctx.rotate(car.rotation);
  
  // Car shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-CAR_WIDTH / 2 + 3, -CAR_HEIGHT / 2 + 3, CAR_WIDTH, CAR_HEIGHT);
  
  // Golden car body
  const gradient = ctx.createLinearGradient(-CAR_WIDTH / 2, 0, CAR_WIDTH / 2, 0);
  gradient.addColorStop(0, '#d4a841');
  gradient.addColorStop(0.5, '#ffd700');
  gradient.addColorStop(1, '#b8860b');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
  
  // Car outline
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 2;
  ctx.strokeRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
  
  // Windshield
  ctx.fillStyle = 'rgba(50, 100, 150, 0.7)';
  ctx.fillRect(CAR_WIDTH / 4, -CAR_HEIGHT / 3, 10, CAR_HEIGHT * 0.66);
  
  // Roof sign (DRIVINGKLASS)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-8, -6, 16, 12);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DK', 0, 2);
  
  // Headlights
  ctx.fillStyle = car.speed > 0 ? '#fffacd' : '#aaa';
  ctx.beginPath();
  ctx.arc(CAR_WIDTH / 2 - 2, -CAR_HEIGHT / 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CAR_WIDTH / 2 - 2, CAR_HEIGHT / 3, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail lights
  ctx.fillStyle = car.brakePressure > 0 ? '#ff0000' : '#8b0000';
  ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2 + 2, 4, 5);
  ctx.fillRect(-CAR_WIDTH / 2, CAR_HEIGHT / 2 - 7, 4, 5);
  
  // Blinkers
  const blinkerOn = Math.floor(Date.now() / 500) % 2 === 0;
  
  if (car.leftBlinker && blinkerOn) {
    ctx.fillStyle = '#ffa500';
    ctx.beginPath();
    ctx.arc(CAR_WIDTH / 2 - 5, -CAR_HEIGHT / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-CAR_WIDTH / 2 + 5, -CAR_HEIGHT / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  if (car.rightBlinker && blinkerOn) {
    ctx.fillStyle = '#ffa500';
    ctx.beginPath();
    ctx.arc(CAR_WIDTH / 2 - 5, CAR_HEIGHT / 2 + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-CAR_WIDTH / 2 + 5, CAR_HEIGHT / 2 + 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

const raindrops: { x: number; y: number; speed: number }[] = [];

function drawRain(ctx: CanvasRenderingContext2D, offset: Vector2D, width: number, height: number) {
  // Initialize raindrops if needed
  while (raindrops.length < 200) {
    raindrops.push({
      x: Math.random() * width + offset.x,
      y: Math.random() * height + offset.y,
      speed: 10 + Math.random() * 10,
    });
  }
  
  ctx.strokeStyle = 'rgba(150, 200, 255, 0.4)';
  ctx.lineWidth = 1;
  
  for (const drop of raindrops) {
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 2, drop.y + 15);
    ctx.stroke();
    
    // Move raindrop
    drop.y += drop.speed;
    drop.x -= 2;
    
    // Reset if off screen
    if (drop.y > offset.y + height) {
      drop.y = offset.y - 20;
      drop.x = Math.random() * width + offset.x;
    }
  }
}

export function calculateCameraOffset(
  carPosition: Vector2D,
  canvasWidth: number,
  canvasHeight: number,
  mapWidth: number,
  mapHeight: number
): Vector2D {
  // Camera follows car, centered
  let x = carPosition.x - canvasWidth / 2;
  let y = carPosition.y - canvasHeight / 2;
  
  // Clamp to map bounds
  x = Math.max(0, Math.min(x, mapWidth - canvasWidth));
  y = Math.max(0, Math.min(y, mapHeight - canvasHeight));
  
  return { x, y };
}
