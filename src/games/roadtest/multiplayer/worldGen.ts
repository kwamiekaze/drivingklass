/**
 * Deterministic world generator for the Star Rush shared city.
 * Same seed → identical world on every client, no coordinator needed.
 *
 * Layout: 6x6 blocks. Each block is BLOCK_SIZE px. Roads are ROAD_W wide
 * running between blocks. Intersections at every block corner may host a
 * stop sign or traffic light. Obstacles + star spawns are seeded along roads.
 */

export const BLOCK_SIZE = 300;
export const ROAD_W = 80;
export const BLOCKS = 6;
export const WORLD = BLOCK_SIZE * BLOCKS + ROAD_W;

export type CityObstacleType = 'cone' | 'parkedCar' | 'stopSign' | 'trafficLight';

export interface CityObstacle {
  id: number;
  type: CityObstacleType;
  x: number;
  y: number;
  // For lights/stops: a stop-line at this world y (approaching from south)
  lightPhase?: number;
}

export interface StarSpawn {
  id: number;
  x: number;
  y: number;
}

export interface CityWorld {
  seed: number;
  obstacles: CityObstacle[];
  starSpawns: StarSpawn[];
  // Free lane centers usable as player start positions
  spawnPoints: { x: number; y: number }[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True if world (x,y) is on a road (either horizontal or vertical corridor). */
export function isOnRoad(x: number, y: number): boolean {
  const mx = x % BLOCK_SIZE;
  const my = y % BLOCK_SIZE;
  return mx < ROAD_W || my < ROAD_W;
}

export function buildCity(seed: number): CityWorld {
  const rnd = mulberry32(seed);
  const obstacles: CityObstacle[] = [];
  const starSpawns: StarSpawn[] = [];
  let id = 1;

  // Intersections: one traffic light or stop sign per interior corner
  for (let gx = 1; gx < BLOCKS; gx++) {
    for (let gy = 1; gy < BLOCKS; gy++) {
      const cx = gx * BLOCK_SIZE + ROAD_W / 2;
      const cy = gy * BLOCK_SIZE + ROAD_W / 2;
      const roll = rnd();
      if (roll < 0.5) {
        obstacles.push({ id: id++, type: 'trafficLight', x: cx, y: cy, lightPhase: rnd() * 8 });
      } else {
        obstacles.push({ id: id++, type: 'stopSign', x: cx, y: cy });
      }
    }
  }

  // Cones + parked cars along horizontal roads
  for (let gy = 0; gy < BLOCKS + 1; gy++) {
    const y = gy * BLOCK_SIZE + ROAD_W / 2;
    for (let x = ROAD_W + 60; x < WORLD - 60; x += 140 + rnd() * 100) {
      const r = rnd();
      if (r < 0.35) obstacles.push({ id: id++, type: 'cone', x, y: y + (rnd() - 0.5) * 30 });
      else if (r < 0.55) obstacles.push({ id: id++, type: 'parkedCar', x, y: y - 30 });
    }
  }
  // Vertical roads
  for (let gx = 0; gx < BLOCKS + 1; gx++) {
    const x = gx * BLOCK_SIZE + ROAD_W / 2;
    for (let y = ROAD_W + 60; y < WORLD - 60; y += 140 + rnd() * 100) {
      const r = rnd();
      if (r < 0.35) obstacles.push({ id: id++, type: 'cone', x: x + (rnd() - 0.5) * 30, y });
      else if (r < 0.55) obstacles.push({ id: id++, type: 'parkedCar', x: x + 30, y });
    }
  }

  // ~25 star spawn points on road segments
  let sid = 1;
  while (starSpawns.length < 25) {
    const x = 60 + rnd() * (WORLD - 120);
    const y = 60 + rnd() * (WORLD - 120);
    if (!isOnRoad(x, y)) continue;
    starSpawns.push({ id: sid++, x, y });
  }

  // Spawn points for player cars (5 corners of the map on road)
  const spawnPoints = [
    { x: ROAD_W / 2, y: ROAD_W / 2 },
    { x: WORLD - ROAD_W / 2, y: ROAD_W / 2 },
    { x: ROAD_W / 2, y: WORLD - ROAD_W / 2 },
    { x: WORLD - ROAD_W / 2, y: WORLD - ROAD_W / 2 },
    { x: WORLD / 2, y: WORLD / 2 },
  ];

  return { seed, obstacles, starSpawns, spawnPoints };
}
