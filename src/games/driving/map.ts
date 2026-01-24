// City map generation for DrivingKlass

import { GameMap, Road, Lane, Building, TrafficLight, StopSign, SpeedZone, ParkingSpot, Vector2D } from './types';

export function generateCityMap(): GameMap {
  const mapWidth = 3000;
  const mapHeight = 2400;
  
  // Create grid-based city roads
  const roads: Road[] = [];
  const lanes: Lane[] = [];
  const buildings: Building[] = [];
  const trafficLights: TrafficLight[] = [];
  const stopSigns: StopSign[] = [];
  const speedZones: SpeedZone[] = [];
  const parkingSpots: ParkingSpot[] = [];

  // Main horizontal roads
  const horizontalRoadPositions = [300, 700, 1100, 1500, 1900];
  // Main vertical roads
  const verticalRoadPositions = [400, 900, 1400, 1900, 2400];

  // Road width
  const roadWidth = 120;
  const laneWidth = 60;

  // Create horizontal roads
  horizontalRoadPositions.forEach((y, i) => {
    roads.push({
      id: `h-road-${i}`,
      start: { x: 0, y },
      end: { x: mapWidth, y },
      width: roadWidth,
      lanes: 2,
      isHighway: i === 4, // Last road is highway
    });

    // Create lanes for this road
    lanes.push({
      id: `h-lane-${i}-south`,
      points: [{ x: 0, y: y - laneWidth / 2 }, { x: mapWidth, y: y - laneWidth / 2 }],
      width: laneWidth,
      direction: 'east',
    });
    lanes.push({
      id: `h-lane-${i}-north`,
      points: [{ x: 0, y: y + laneWidth / 2 }, { x: mapWidth, y: y + laneWidth / 2 }],
      width: laneWidth,
      direction: 'west',
    });
  });

  // Create vertical roads
  verticalRoadPositions.forEach((x, i) => {
    roads.push({
      id: `v-road-${i}`,
      start: { x, y: 0 },
      end: { x, y: mapHeight },
      width: roadWidth,
      lanes: 2,
      isHighway: false,
    });

    lanes.push({
      id: `v-lane-${i}-east`,
      points: [{ x: x - laneWidth / 2, y: 0 }, { x: x - laneWidth / 2, y: mapHeight }],
      width: laneWidth,
      direction: 'south',
    });
    lanes.push({
      id: `v-lane-${i}-west`,
      points: [{ x: x + laneWidth / 2, y: 0 }, { x: x + laneWidth / 2, y: mapHeight }],
      width: laneWidth,
      direction: 'north',
    });
  });

  // Create intersections with traffic lights
  let lightId = 0;
  let signId = 0;
  
  verticalRoadPositions.forEach((x, vi) => {
    horizontalRoadPositions.forEach((y, hi) => {
      // Alternate between traffic lights and stop signs
      if ((vi + hi) % 2 === 0) {
        // Traffic lights
        trafficLights.push({
          id: `light-${lightId++}`,
          position: { x: x - 70, y: y - 70 },
          state: 'red',
          timer: 0,
        });
        trafficLights.push({
          id: `light-${lightId++}`,
          position: { x: x + 70, y: y + 70 },
          state: 'green',
          timer: 0,
        });
      } else {
        // Stop signs
        stopSigns.push({
          id: `stop-${signId++}`,
          position: { x: x - 70, y: y - 70 },
          direction: Math.PI / 4,
        });
        stopSigns.push({
          id: `stop-${signId++}`,
          position: { x: x + 70, y: y + 70 },
          direction: -Math.PI * 3 / 4,
        });
      }
    });
  });

  // Create buildings in blocks
  const blockColors = ['#2a2a3a', '#3a3a4a', '#252535', '#353545', '#1a1a2a'];
  
  for (let bx = 0; bx < 4; bx++) {
    for (let by = 0; by < 4; by++) {
      const blockX = 100 + bx * 500;
      const blockY = 100 + by * 400;
      
      // Multiple buildings per block
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          const buildingWidth = 80 + Math.random() * 60;
          const buildingHeight = 60 + Math.random() * 80;
          
          buildings.push({
            id: `building-${bx}-${by}-${i}-${j}`,
            position: {
              x: blockX + i * 120 + 40,
              y: blockY + j * 150 + 40,
            },
            width: buildingWidth,
            height: buildingHeight,
            color: blockColors[Math.floor(Math.random() * blockColors.length)],
          });
        }
      }
    }
  }

  // Speed zones
  speedZones.push({
    id: 'city-main',
    bounds: { x: 0, y: 0, width: mapWidth, height: 1800 },
    limit: 35,
    type: 'city',
  });
  
  speedZones.push({
    id: 'school-zone',
    bounds: { x: 800, y: 600, width: 400, height: 300 },
    limit: 15,
    type: 'school',
  });
  
  speedZones.push({
    id: 'highway',
    bounds: { x: 0, y: 1800, width: mapWidth, height: 600 },
    limit: 65,
    type: 'highway',
  });

  // Parking lots
  const parkingY = 500;
  const parkingX = 1600;
  
  // Perpendicular parking
  for (let i = 0; i < 4; i++) {
    parkingSpots.push({
      id: `perp-${i}`,
      position: { x: parkingX + i * 50, y: parkingY },
      rotation: 0,
      width: 45,
      height: 80,
      type: 'perpendicular',
      isTarget: i === 1,
    });
  }

  // Parallel parking
  for (let i = 0; i < 3; i++) {
    parkingSpots.push({
      id: `parallel-${i}`,
      position: { x: parkingX + 300, y: parkingY + i * 100 },
      rotation: Math.PI / 2,
      width: 80,
      height: 45,
      type: 'parallel',
      isTarget: i === 1,
    });
  }

  // Reverse parking area
  for (let i = 0; i < 4; i++) {
    parkingSpots.push({
      id: `reverse-${i}`,
      position: { x: parkingX + i * 50, y: parkingY + 350 },
      rotation: 0,
      width: 45,
      height: 80,
      type: 'reverse',
      isTarget: i === 2,
    });
  }

  return {
    width: mapWidth,
    height: mapHeight,
    roads,
    lanes,
    buildings,
    trafficLights,
    stopSigns,
    speedZones,
    parkingSpots,
  };
}

// Check if point is on a lane line
export function isOnLaneLine(position: Vector2D, lanes: Lane[]): boolean {
  for (const lane of lanes) {
    if (lane.points.length < 2) continue;
    
    // Check distance to lane center line
    const start = lane.points[0];
    const end = lane.points[lane.points.length - 1];
    
    // Simple distance to line check
    const lineLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    if (lineLength === 0) continue;
    
    const t = Math.max(0, Math.min(1,
      ((position.x - start.x) * (end.x - start.x) + (position.y - start.y) * (end.y - start.y)) /
      (lineLength * lineLength)
    ));
    
    const closestX = start.x + t * (end.x - start.x);
    const closestY = start.y + t * (end.y - start.y);
    
    const distance = Math.sqrt(
      Math.pow(position.x - closestX, 2) + Math.pow(position.y - closestY, 2)
    );
    
    // If within 5 pixels of lane edge
    const edgeDistance = Math.abs(distance - lane.width / 2);
    if (edgeDistance < 8) {
      return true;
    }
  }
  
  return false;
}

// Get current speed zone for position
export function getCurrentSpeedZone(position: Vector2D, speedZones: SpeedZone[]): SpeedZone | null {
  for (const zone of speedZones) {
    if (
      position.x >= zone.bounds.x &&
      position.x <= zone.bounds.x + zone.bounds.width &&
      position.y >= zone.bounds.y &&
      position.y <= zone.bounds.y + zone.bounds.height
    ) {
      return zone;
    }
  }
  return null;
}

// Check if car is in parking zone
export function getActiveParkingSpot(position: Vector2D, parkingSpots: ParkingSpot[]): ParkingSpot | null {
  for (const spot of parkingSpots) {
    const dx = position.x - spot.position.x;
    const dy = position.y - spot.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 60 && spot.isTarget) {
      return spot;
    }
  }
  return null;
}
